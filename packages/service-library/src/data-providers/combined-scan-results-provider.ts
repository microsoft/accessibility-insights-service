// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Readable } from 'stream';
import { AxeResults } from 'axe-result-converter';
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import { CombinedAxeResults, CombinedScanResults } from 'storage-documents';
import { BodyParser } from 'common';
import { DataProvidersCommon } from './data-providers-common';

export type ReadErrorCode = 'documentNotFound' | 'JSONParseError' | 'streamError';
export type CreateErrorCode = 'documentAlreadyExists' | WriteErrorCode;
export type WriteErrorCode = 'etagMismatch' | 'httpStatusError';

export type CombinedScanResultsError<ErrorCodeType> = {
    errorCode: ErrorCodeType;
    data?: string;
};

export type CombinedScanResultsReadResponse = {
    error?: CombinedScanResultsError<ReadErrorCode>;
    results?: CombinedScanResults;
    etag?: string;
};

export type CombinedScanResultsWriteResponse = {
    error?: CombinedScanResultsError<WriteErrorCode>;
    etag?: string;
};

export type CombinedScanResultsCreateResponse = {
    error?: CombinedScanResultsError<CreateErrorCode>;
    results?: CombinedScanResults;
    etag?: string;
};

@injectable()
export class CombinedScanResultsProvider {
    private static readonly preconditionFailedStatusCode = 412;

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
        @inject(BodyParser) private readonly bodyParser: BodyParser,
    ) {}

    public async saveCombinedResults(
        fileId: string,
        content: CombinedScanResults,
        etag?: string,
    ): Promise<CombinedScanResultsWriteResponse> {
        const filePath = this.dataProvidersCommon.getBlobName(fileId);
        const contentString = JSON.stringify(content);
        const condition = etag ? { ifMatchEtag: etag } : undefined;
        const response = await this.blobStorageClient.uploadBlobContent(
            DataProvidersCommon.combinedResultsBlobContainerName,
            filePath,
            contentString,
            condition,
        );

        if (this.statusSuccessful(response.statusCode)) {
            return { etag: response.etag };
        }
        if (response.statusCode === CombinedScanResultsProvider.preconditionFailedStatusCode) {
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

    public async createCombinedResults(fileId: string): Promise<CombinedScanResultsCreateResponse> {
        const response = await this.readBlob(fileId);
        if (!response.notFound) {
            return {
                error: {
                    errorCode: 'documentAlreadyExists',
                },
            };
        }

        const emptyCombinedResults: CombinedScanResults = {
            urlCount: {
                failed: 0,
                passed: 0,
                total: 0,
            },
            axeResults: {
                urls: [],
                violations: new AxeResults().serialize(),
                passes: new AxeResults().serialize(),
                incomplete: new AxeResults().serialize(),
                inapplicable: new AxeResults().serialize(),
            } as CombinedAxeResults,
        };

        const saveResponse = await this.saveCombinedResults(fileId, emptyCombinedResults);
        if (saveResponse.error) {
            return saveResponse;
        }

        return {
            results: emptyCombinedResults,
            etag: saveResponse.etag,
        };
    }

    public async readCombinedResults(fileId: string): Promise<CombinedScanResultsReadResponse> {
        const downloadResponse = await this.readBlob(fileId);

        if (downloadResponse.notFound) {
            return {
                error: { errorCode: 'documentNotFound' },
            };
        }

        let contentString: string;
        try {
            contentString = (await this.bodyParser.getRawBody(downloadResponse.content as Readable)).toString();
        } catch (error) {
            return {
                error: {
                    errorCode: 'streamError',
                    data: JSON.stringify(error),
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
                    errorCode: 'JSONParseError',
                    data: contentString,
                },
            };
        }
    }

    private async readBlob(fileId: string): Promise<BlobContentDownloadResponse> {
        return this.blobStorageClient.getBlobContent(
            DataProvidersCommon.combinedResultsBlobContainerName,
            this.dataProvidersCommon.getBlobName(fileId),
        );
    }

    private statusSuccessful(statusCode: number): boolean {
        return statusCode >= 200 && statusCode < 300;
    }
}
