// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BlobClient, RestError, BlockBlobUploadOptions } from '@azure/storage-blob';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { BlobServiceClientProvider, iocTypeNames } from '../ioc-types';

export interface BlobContentDownloadResponse {
    notFound: boolean;
    content?: NodeJS.ReadableStream;
    etag?: string;
}

export interface BlobContentUploadResponse {
    statusCode: number;
    etag?: string;
}

export interface BlobSaveCondition {
    ifMatchEtag?: string;
    ifNoneMatchEtag?: string;
}

@injectable()
export class BlobStorageClient {
    constructor(@inject(iocTypeNames.BlobServiceClientProvider) private readonly blobServiceClientProvider: BlobServiceClientProvider) {}

    public async getBlobContent(containerName: string, blobName: string): Promise<BlobContentDownloadResponse> {
        const blobClient = await this.getBlobClient(containerName, blobName);

        try {
            const response = await blobClient.download(0, undefined);

            return {
                notFound: false,
                content: response.readableStreamBody,
                etag: response.etag,
            };
        } catch (e) {
            const restResponse = e as RestError;
            if (!isNil(restResponse)) {
                if (restResponse.statusCode === 404) {
                    return {
                        notFound: true,
                    };
                }
            }
            throw e;
        }
    }

    public async uploadBlobContent(
        containerName: string,
        blobName: string,
        content: string,
        condition?: BlobSaveCondition,
    ): Promise<BlobContentUploadResponse> {
        const blobClient = await this.getBlobClient(containerName, blobName);
        const blockBlobClient = blobClient.getBlockBlobClient();

        let options: BlockBlobUploadOptions;
        if (condition?.ifMatchEtag !== undefined) {
            options = { conditions: { ifMatch: condition.ifMatchEtag } };
        } else if (condition?.ifNoneMatchEtag !== undefined) {
            options = { conditions: { ifNoneMatch: condition.ifNoneMatchEtag } };
        }

        const { _response, etag } = await blockBlobClient.upload(content, content.length, options);

        return {
            statusCode: _response.status,
            etag: etag,
        };
    }

    private async getBlobClient(containerName: string, blobName: string): Promise<BlobClient> {
        const blobServiceClient = await this.blobServiceClientProvider();
        const containerClient = blobServiceClient.getContainerClient(containerName);

        return containerClient.getBlobClient(blobName);
    }
}
