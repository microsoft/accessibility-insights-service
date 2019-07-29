// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RestError } from '@azure/ms-rest-js';
import { BlobClient, BlobServiceClient } from '@azure/storage-blob';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { BlobServiceClientFactory, runtimeConfigIocTypes } from './ioc-types';

export interface BlobContentUpdateResponse {
    isModified: boolean;
    notFound: boolean;
    updatedContent: string;
}

@injectable()
export class BlobReader {
    private readonly blobServiceClient: BlobServiceClient;

    constructor(@inject(runtimeConfigIocTypes.BlobServiceClientFactory) blobServiceClientProvider: BlobServiceClientFactory) {
        this.blobServiceClient = blobServiceClientProvider();
    }

    public async getModifiedBlobContent(containerName: string, blobName: string, modifiedSince: Date): Promise<BlobContentUpdateResponse> {
        const blobClient = this.getBlobClient(containerName, blobName);

        try {
            const response = await blobClient.download(0, undefined, {
                blobAccessConditions: { modifiedAccessConditions: { ifModifiedSince: modifiedSince } },
            });

            return {
                notFound: false,
                isModified: true,
                updatedContent: await this.getContentFromStream(response.readableStreamBody),
            };
        } catch (e) {
            const restResponse = e as RestError;
            if (!isNil(restResponse)) {
                if (restResponse.statusCode === 404) {
                    return {
                        notFound: true,
                        isModified: undefined,
                        updatedContent: undefined,
                    };
                }
                if (restResponse.statusCode === 304) {
                    return {
                        notFound: false,
                        isModified: false,
                        updatedContent: undefined,
                    };
                }
            }
            throw e;
        }
    }

    private getBlobClient(containerName: string, blobName: string): BlobClient {
        const containerClient = this.blobServiceClient.getContainerClient(containerName);

        return containerClient.getBlobClient(blobName);
    }

    private async getContentFromStream(readableStream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: string[] = [];

            readableStream.on('data', (data: unknown) => {
                chunks.push(data.toString());
            });
            readableStream.on('end', () => {
                resolve(chunks.join(''));
            });
            readableStream.on('error', err => {
                reject(err);
            });
        });
    }
}
