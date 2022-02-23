// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from 'stream';
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import { OnDemandPageScanReport, PrivacyScanCombinedReport } from 'storage-documents';
import { BodyParser, System } from 'common';
import { DataProvidersCommon } from './data-providers-common';
import { GeneratedReport } from './report-writer';

export type PrivacyReportReadErrorCode = 'blobNotFound' | 'jsonParseError' | 'streamError';
export type PrivacyReportWriteErrorCode = 'etagMismatch' | 'httpStatusError';

export type PrivacyReportError<ErrorCodeType> = {
    errorCode: ErrorCodeType;
    data?: string;
};

export type PrivacyReportReadResponse = {
    error?: PrivacyReportError<PrivacyReportReadErrorCode>;
    results?: PrivacyScanCombinedReport;
    etag?: string;
};

export type PrivacyReportWriteResponse = {
    error?: PrivacyReportError<PrivacyReportWriteErrorCode>;
    etag?: string;
    report?: OnDemandPageScanReport;
};

@injectable()
export class PrivacyScanCombinedReportProvider {
    private static readonly preconditionFailedStatusCode = 412;

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
        @inject(BodyParser) private readonly bodyParser: BodyParser,
    ) {}

    public async writeCombinedReport(report: GeneratedReport, etag?: string): Promise<PrivacyReportWriteResponse> {
        const filePath = this.dataProvidersCommon.getBlobName(report.id);
        const condition = etag ? { ifMatchEtag: etag } : undefined;
        const response = await this.blobStorageClient.uploadBlobContent(
            DataProvidersCommon.reportBlobContainerName,
            filePath,
            report.content,
            condition,
        );

        if (this.statusSuccessful(response.statusCode)) {
            return {
                etag: response.etag,
                report: {
                    format: report.format,
                    href: filePath,
                    reportId: report.id,
                },
            };
        }

        if (response.statusCode === PrivacyScanCombinedReportProvider.preconditionFailedStatusCode) {
            return {
                error: {
                    errorCode: 'etagMismatch',
                },
            };
        }

        return {
            error: {
                errorCode: 'httpStatusError',
                data: `${response.statusCode}`,
            },
        };
    }

    public async readCombinedReport(fileId: string): Promise<PrivacyReportReadResponse> {
        const downloadResponse = await this.readBlob(fileId);
        if (downloadResponse.notFound) {
            return {
                error: { errorCode: 'blobNotFound' },
            };
        }

        let contentString: string;
        try {
            contentString = (await this.bodyParser.getRawBody(downloadResponse.content as Readable)).toString();
        } catch (error) {
            return {
                error: {
                    errorCode: 'streamError',
                    data: System.serializeError(error),
                },
            };
        }

        try {
            const content = JSON.parse(contentString);

            return {
                results: content,
                etag: downloadResponse.etag,
            };
        } catch (error) {
            return {
                error: {
                    errorCode: 'jsonParseError',
                    data: System.serializeError(error),
                },
            };
        }
    }

    private async readBlob(fileId: string): Promise<BlobContentDownloadResponse> {
        return this.blobStorageClient.getBlobContent(
            DataProvidersCommon.reportBlobContainerName,
            this.dataProvidersCommon.getBlobName(fileId),
        );
    }

    private statusSuccessful(statusCode: number): boolean {
        return statusCode >= 200 && statusCode < 300;
    }
}
