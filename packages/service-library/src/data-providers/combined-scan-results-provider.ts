// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BlobStorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import { CombinedScanResults } from 'storage-documents';
import { DataProvidersCommon } from './data-providers-common';

export type CombinedScanResultsErrorCode = 'documentNotFound' | 'parseError';
export type CombinedScanResultsError = {
    errorCode: CombinedScanResultsErrorCode;
    data?: string;
};

export type CombinedScanResultsResponse = {
    error?: CombinedScanResultsError;
    results?: CombinedScanResultsErrorCode;
};

@injectable()
export class CombinedScanResultsProvider {
    constructor(
        @inject(BlobStorageClient) private readonly blobStorageClient: BlobStorageClient,
        @inject(DataProvidersCommon) private readonly dataProvidersCommon: DataProvidersCommon,
    ) {}

    public async saveCombinedResults(fileId: string, content: CombinedScanResults, etag?: string): Promise<string> {
        const filePath = this.dataProvidersCommon.getBlobName(fileId);
        const contentString = JSON.stringify(content);
        const condition = etag ? { ifMatchEtag: etag } : undefined;
        await this.blobStorageClient.uploadBlobContent(
            DataProvidersCommon.combinedResultsBlobContainerName,
            filePath,
            contentString,
            condition
        );

        return filePath;
    }

    public async readCombinedResults(fileId: string): Promise<CombinedScanResultsResponse> {
        const downloadResponse = await this.blobStorageClient.getBlobContent(
            DataProvidersCommon.combinedResultsBlobContainerName,
            this.dataProvidersCommon.getBlobName(fileId),
        );

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
}
