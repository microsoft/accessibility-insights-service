// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-result-converter';
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import { CombinedAxeResults, CombinedScanResults } from 'storage-documents';
import { DataProvidersCommon } from './data-providers-common';

export type ReadErrorCode = 'documentNotFound' | 'parseError' | 'documentAlreadyExists';
export type CreateErrorCode = 'documentAlreadyExists' | WriteErrorCode;
export type WriteErrorCode = 'etagMismatch' | 'httpStatusError';

export type CombinedScanResultsError<ErrorCodeType> = {
    errorCode: ErrorCodeType;
    data?: string;
};

export type CombinedScanResultsReadResponse = {
    error?: CombinedScanResultsError<ReadErrorCode>;
    results?: CombinedScanResults;
};

export type CombinedScanResultsWriteResponse = {
    error?: CombinedScanResultsError<WriteErrorCode>;
    filePath?: string;
};

export type CombinedScanResultsCreateResponse = {
    error?: CombinedScanResultsError<CreateErrorCode>;
    results?: CombinedScanResults;
};

@injectable()
export class CombinedScanResultsProvider {
    private static readonly preconditionFailedStatusCode = 412;

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
    ) {}

    public async saveCombinedResults(
        fileId: string,
        content: CombinedScanResults,
        etag?: string
    ): Promise<CombinedScanResultsWriteResponse> {
        const filePath = this.dataProvidersCommon.getBlobName(fileId);
        const contentString = JSON.stringify(content);
        const condition = etag ? { ifMatchEtag: etag } : undefined;
        const response = await this.blobStorageClient.uploadBlobContent(
            DataProvidersCommon.combinedResultsBlobContainerName,
            filePath,
            contentString,
            condition
        );

        if (this.statusSuccessful(response.statusCode)) {
            return { filePath };
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
        };
    }

    public async readCombinedResults(fileId: string): Promise<CombinedScanResultsReadResponse> {
        const downloadResponse = await this.readBlob(fileId);

        if (downloadResponse.notFound) {
            return {
                error: { errorCode: 'documentNotFound' },
            };
        }

        const  contentString = downloadResponse.content.read().toString();
        try {
            const content = JSON.parse(contentString);

            return {
                results: content,
            };
        } catch (error) {
            return {
                error: {
                    errorCode: 'parseError',
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
