// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from 'stream';
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import { BodyParser, System } from 'common';
import { AxeResultsList } from 'axe-result-converter';
import { AxeScanResults } from 'scanner-global-library';
import { DataProvidersCommon } from './data-providers-common';
import { ReadErrorCode } from './combined-scan-results-provider';

export interface ReportContent {
    content?: AxeScanResults;
    errorCode?: ReadErrorCode;
    error?: string;
    etag?: string;
}

@injectable()
export class PageScanRunReportProvider {
    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
        @inject(BodyParser) private readonly bodyParser: BodyParser,
    ) {}

    public async saveReport(fileId: string, content: string): Promise<string> {
        const filePath = this.dataProvidersCommon.getBlobName(fileId);
        await this.blobStorageClient.uploadBlobContent(DataProvidersCommon.reportBlobContainerName, filePath, content);

        return filePath;
    }

    public async readReport(fileId: string): Promise<BlobContentDownloadResponse> {
        return this.blobStorageClient.getBlobContent(
            DataProvidersCommon.reportBlobContainerName,
            this.dataProvidersCommon.getBlobName(fileId),
        );
    }

    public async readReportContent(fileId: string): Promise<ReportContent> {
        const downloadResponse = await this.readReport(fileId);
        if (downloadResponse.notFound) {
            return {
                errorCode: 'blobNotFound',
            };
        }

        let contentString: string;
        try {
            contentString = (await this.bodyParser.getRawBody(downloadResponse.content as Readable)).toString();
        } catch (error) {
            return {
                errorCode: 'streamError',
                error: System.serializeError(error),
            };
        }

        try {
            const content = JSON.parse(contentString, (key, value) => {
                if (key === 'violations' || key === 'passes' || key === 'incomplete' || key === 'inapplicable') {
                    return new AxeResultsList(value);
                }

                return value;
            });

            return {
                content,
                etag: downloadResponse.etag,
            };
        } catch (error) {
            return {
                errorCode: 'jsonParseError',
                error: System.serializeError(error),
            };
        }
    }
}
