// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import {
    BlobClient,
    BlobServiceClient,
    BlockBlobClient,
    ContainerClient,
    Models,
    RestError,
    SharedKeyCredential,
} from '@azure/storage-blob';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { IMock, It, Mock } from 'typemoq';
import { BlobServiceClientProvider, iocTypeNames } from '../ioc-types';
import { BlobContentDownloadResponse, BlobService } from './blob-service';

// tslint:disable: no-any no-object-literal-type-assertion

describe(BlobService, () => {
    let blobServiceClientMock: IMock<BlobServiceClient>;
    let blobClientMock: IMock<BlobClient>;
    let containerClientMock: IMock<ContainerClient>;
    let testSubject: BlobService;
    const containerName = 'test-container';
    const blobName = 'blob name1';

    beforeEach(() => {
        blobServiceClientMock = Mock.ofType(BlobServiceClient);
        blobClientMock = Mock.ofType(BlobClient);
        containerClientMock = Mock.ofType(ContainerClient);

        blobServiceClientMock.setup(b => b.getContainerClient(containerName)).returns(() => containerClientMock.object);
        containerClientMock.setup(c => c.getBlobClient(blobName)).returns(() => blobClientMock.object);

        testSubject = new BlobService(async () => blobServiceClientMock.object);
    });

    describe('getBlobContent', () => {
        it('downloads blob content', async () => {
            const readableStream: NodeJS.ReadableStream = 'test stream' as any;

            blobClientMock
                .setup(async b => b.download(0, undefined))
                .returns(async () => Promise.resolve({ readableStreamBody: readableStream } as Models.BlobDownloadResponse))
                .verifiable();

            const response = await testSubject.getBlobContent(containerName, blobName);

            expect(response).toEqual({ content: readableStream, notFound: false } as BlobContentDownloadResponse);
        });

        it('returns not found, if blob does not exist', async () => {
            blobClientMock
                .setup(async b => b.download(0, undefined))
                .returns(async () => Promise.reject({ statusCode: 404 } as RestError))
                .verifiable();

            const response = await testSubject.getBlobContent(containerName, blobName);

            expect(response).toEqual({ content: undefined, notFound: true } as BlobContentDownloadResponse);
        });

        it('throws if unknown error occurred', async () => {
            blobClientMock
                .setup(async b => b.download(0, undefined))
                // tslint:disable-next-line:
                .returns(async () => Promise.reject('test error 1'))
                .verifiable();

            await expect(testSubject.getBlobContent(containerName, blobName)).rejects.toEqual('test error 1');
        });
    });

    describe('uploadBlobContent', () => {
        let blockBlobClientMock: IMock<BlockBlobClient>;
        const content = 'blob content 1';

        beforeEach(() => {
            blockBlobClientMock = Mock.ofType(BlockBlobClient);
            blobClientMock.setup(b => b.getBlockBlobClient()).returns(() => blockBlobClientMock.object);
        });

        it('uploads content', async () => {
            blockBlobClientMock
                .setup(async b => b.upload(content, content.length))
                .returns(async () => Promise.resolve(undefined))
                .verifiable();

            await testSubject.uploadBlobContent(containerName, blobName, content);

            blockBlobClientMock.verifyAll();
        });
    });
});
