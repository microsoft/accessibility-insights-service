// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobClient, BlobServiceClient, RestError } from '@azure/storage-blob';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { BlobServiceClientProvider, iocTypeNames } from '../ioc-types';

export interface BlobContentDownloadResponse {
    notFound: boolean;
    content: NodeJS.ReadableStream;
}

@injectable()
export class BlobService {
    constructor(@inject(iocTypeNames.BlobServiceClientProvider) private readonly blobServiceClientProvider: BlobServiceClientProvider) {}

    public async getBlobContent(containerName: string, blobName: string): Promise<BlobContentDownloadResponse> {
        const blobClient = await this.getBlobClient(containerName, blobName);

        try {
            const response = await blobClient.download(0, undefined);

            return {
                notFound: false,
                content: response.readableStreamBody,
            };
        } catch (e) {
            const restResponse = e as RestError;
            if (!isNil(restResponse)) {
                if (restResponse.statusCode === 404) {
                    return {
                        notFound: true,
                        content: undefined,
                    };
                }
            }
            throw e;
        }
    }

    public async uploadBlobContent(containerName: string, blobName: string, content: string): Promise<void> {
        const blobClient = await this.getBlobClient(containerName, blobName);

        const blockBlobClient = blobClient.getBlockBlobClient();
        await blockBlobClient.upload(content, content.length);
    }

    private async getBlobClient(containerName: string, blobName: string): Promise<BlobClient> {
        const blobServiceClient = await this.blobServiceClientProvider();
        const containerClient = blobServiceClient.getContainerClient(containerName);

        return containerClient.getBlobClient(blobName);
    }
}
