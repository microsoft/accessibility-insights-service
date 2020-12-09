// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import {
    BlobClient,
    BlobDownloadResponseModel,
    BlobServiceClient,
    BlockBlobClient,
    ContainerClient,
    RestError,
    BlockBlobUploadResponse,
} from '@azure/storage-blob';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { BlobContentDownloadResponse, BlobStorageClient } from './blob-storage-client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

describe(BlobStorageClient, () => {
    let blobServiceClientMock: IMock<BlobServiceClient>;
    let blobClientMock: IMock<BlobClient>;
    let containerClientMock: IMock<ContainerClient>;
    let testSubject: BlobStorageClient;
    const containerName = 'test-container';
    const blobName = 'blob name1';
    const etag = 'etag';

    beforeEach(() => {
        blobServiceClientMock = Mock.ofType<BlobServiceClient>();
        blobServiceClientMock = getPromisableDynamicMock(blobServiceClientMock);

        blobClientMock = Mock.ofType<BlobClient>();
        blobClientMock = getPromisableDynamicMock(blobClientMock);

        containerClientMock = Mock.ofType<ContainerClient>();
        containerClientMock = getPromisableDynamicMock(containerClientMock);

        blobServiceClientMock.setup((b) => b.getContainerClient(containerName)).returns(() => containerClientMock.object);
        containerClientMock.setup((c) => c.getBlobClient(blobName)).returns(() => blobClientMock.object);

        testSubject = new BlobStorageClient(async () => blobServiceClientMock.object);
    });

    describe('getBlobContent', () => {
        it('downloads blob content', async () => {
            const readableStream: NodeJS.ReadableStream = 'test stream' as any;

            blobClientMock
                .setup(async (b) => b.download(0, undefined))
                .returns(async () => Promise.resolve({ readableStreamBody: readableStream, etag: etag } as BlobDownloadResponseModel))
                .verifiable();

            const response = await testSubject.getBlobContent(containerName, blobName);

            expect(response).toEqual({ content: readableStream, notFound: false, etag: etag } as BlobContentDownloadResponse);
        });

        it('returns not found, if blob does not exist', async () => {
            blobClientMock
                .setup(async (b) => b.download(0, undefined))
                .returns(async () => Promise.reject({ statusCode: 404 } as RestError))
                .verifiable();

            const response = await testSubject.getBlobContent(containerName, blobName);

            expect(response).toEqual({ notFound: true } as BlobContentDownloadResponse);
        });

        it('throws if unknown error occurred', async () => {
            blobClientMock
                .setup(async (b) => b.download(0, undefined))
                .returns(async () => Promise.reject('test error 1'))
                .verifiable();

            await expect(testSubject.getBlobContent(containerName, blobName)).rejects.toEqual('test error 1');
        });
    });

    describe('uploadBlobContent', () => {
        let blockBlobClientMock: IMock<BlockBlobClient>;
        const content = 'blob content 1';
        const blockUploadResponse = {
            _response: { status: 200 },
            etag: etag,
        } as BlockBlobUploadResponse;
        const expectedUploadResponse = {
            statusCode: 200,
            etag: etag,
        };

        beforeEach(() => {
            blockBlobClientMock = Mock.ofType<BlockBlobClient>();
            blockBlobClientMock = getPromisableDynamicMock(blockBlobClientMock);
            blobClientMock.setup((b) => b.getBlockBlobClient()).returns(() => blockBlobClientMock.object);
        });

        it('uploads content', async () => {
            blockBlobClientMock
                .setup(async (b) => b.upload(content, content.length, undefined))
                .returns(async () => Promise.resolve(blockUploadResponse))
                .verifiable();

            const response = await testSubject.uploadBlobContent(containerName, blobName, content);

            expect(response).toEqual(expectedUploadResponse);

            blockBlobClientMock.verifyAll();
        });

        it('uploads content with match to etag', async () => {
            blockBlobClientMock
                .setup(async (b) => b.upload(content, content.length, { conditions: { ifMatch: etag } }))
                .returns(async () => Promise.resolve(blockUploadResponse))
                .verifiable();

            const response = await testSubject.uploadBlobContent(containerName, blobName, content, { ifMatchEtag: etag });

            expect(response).toEqual(expectedUploadResponse);

            blockBlobClientMock.verifyAll();
        });

        it('uploads content with none match to etag', async () => {
            blockBlobClientMock
                .setup(async (b) => b.upload(content, content.length, { conditions: { ifNoneMatch: etag } }))
                .returns(async () => Promise.resolve(blockUploadResponse))
                .verifiable();

            const response = await testSubject.uploadBlobContent(containerName, blobName, content, { ifNoneMatchEtag: etag });

            expect(response).toEqual(expectedUploadResponse);

            blockBlobClientMock.verifyAll();
        });
    });
});
