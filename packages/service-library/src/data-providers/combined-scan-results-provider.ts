// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Readable } from 'stream';
import { AxeResults, AxeCoreResults } from 'axe-result-converter';
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import { CombinedScanResults } from 'storage-documents';
import { BodyParser, System } from 'common';
import { DataProvidersCommon } from './data-providers-common';

export type ReadErrorCode = 'blobNotFound' | 'jsonParseError' | 'streamError';
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

@injectable()
export class CombinedScanResultsProvider {
    private static readonly preconditionFailedStatusCode = 412;

    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
        @inject(BodyParser) private readonly bodyParser: BodyParser,
    ) {}

    public async writeCombinedResults(
        fileId: string,
        combinedScanResults: CombinedScanResults,
        etag?: string,
    ): Promise<CombinedScanResultsWriteResponse> {
        const filePath = this.dataProvidersCommon.getBlobName(fileId);
        const contentString = JSON.stringify(combinedScanResults ?? this.getEmptyCombinedScanResults());
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

    public async readCombinedResults(fileId: string): Promise<CombinedScanResultsReadResponse> {
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
            const content = JSON.parse(contentString, (key, value) => {
                if (key === 'violations' || key === 'passes' || key === 'incomplete' || key === 'inapplicable') {
                    return new AxeResults(value);
                }

                return value;
            });

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

    public getEmptyResponse(): CombinedScanResultsReadResponse {
        return {
            results: this.getEmptyCombinedScanResults(),
        };
    }

    private getEmptyCombinedScanResults(): CombinedScanResults {
        return {
            urlCount: {
                failed: 0,
                passed: 0,
                total: 0,
            },
            axeResults: {
                urls: [],
                violations: new AxeResults(),
                passes: new AxeResults(),
                incomplete: new AxeResults(),
                inapplicable: new AxeResults(),
            } as AxeCoreResults,
        };
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
