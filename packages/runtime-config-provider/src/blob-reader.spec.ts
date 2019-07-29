// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { RestError } from '@azure/ms-rest-js';
import { BlobClient, BlobServiceClient, ContainerClient, Models } from '@azure/storage-blob';
import { Stream } from 'stream';
import { IMock, Mock } from 'typemoq';
import { BlobReader } from './blob-reader';
import { BlobServiceClientFactory } from './ioc-types';

// tslint:disable: no-null-keyword no-object-literal-type-assertion

describe(BlobReader, () => {
    let testSubject: BlobReader;
    let blobServiceClientMock: IMock<BlobServiceClient>;
    let blobServiceClientFactoryStub: BlobServiceClientFactory;
    let containerClientMock: IMock<ContainerClient>;
    let blobClientMock: IMock<BlobClient>;

    const containerName = 'container1';
    const blobName = 'blob1';

    beforeEach(() => {
        blobServiceClientMock = Mock.ofType(BlobServiceClient);
        blobServiceClientFactoryStub = () => blobServiceClientMock.object;

        containerClientMock = Mock.ofType(ContainerClient);
        blobClientMock = Mock.ofType(BlobClient);

        blobServiceClientMock.setup(s => s.getContainerClient(containerName)).returns(() => containerClientMock.object);
        containerClientMock.setup(s => s.getBlobClient(blobName)).returns(() => blobClientMock.object);

        testSubject = new BlobReader(blobServiceClientFactoryStub);
    });

    describe('getModifiedBlobContent', () => {
        it('downloads blob content as string', async () => {
            const dataChunks = ['chunk1', 'chunk2'];
            const readableStream = getReadableStreamForDataChunks(dataChunks);
            const modifiedTime = new Date(2, 3, 2019);

            setupSuccessfulDownloadBlobCall(readableStream, modifiedTime);

            const content = await testSubject.getModifiedBlobContent(containerName, blobName, modifiedTime);

            expect(content.isModified).toBe(true);
            expect(content.notFound).toBe(false);
            expect(content.updatedContent).toBe(dataChunks.join(''));
        });

        it('throws if unable to parse blob content', async () => {
            const readableStream = getErrorReadableStream();
            const modifiedTime = new Date(2, 3, 2019);

            setupSuccessfulDownloadBlobCall(readableStream, modifiedTime);

            await expect(testSubject.getModifiedBlobContent(containerName, blobName, modifiedTime)).rejects.toBeDefined();
        });

        test.each([null, { statusCode: 401 } as RestError])('throws if rest call failed with error response - %o', async errResponse => {
            const modifiedTime = new Date(2, 3, 2019);

            setupFailureDownloadBlobCall(errResponse, modifiedTime);

            await expect(testSubject.getModifiedBlobContent(containerName, blobName, modifiedTime)).rejects.toBe(errResponse);
        });

        it('returns not modified when content not changed', async () => {
            const errResponse = { statusCode: 304 } as RestError;
            const modifiedTime = new Date(2, 3, 2019);

            setupFailureDownloadBlobCall(errResponse, modifiedTime);

            const actualResponse = await testSubject.getModifiedBlobContent(containerName, blobName, modifiedTime);

            expect(actualResponse.isModified).toBe(false);
            expect(actualResponse.notFound).toBe(false);
            expect(actualResponse.updatedContent).toBeUndefined();
        });

        it('returns not found when blob not found', async () => {
            const errResponse = { statusCode: 404 } as RestError;
            const modifiedTime = new Date(2, 3, 2019);

            setupFailureDownloadBlobCall(errResponse, modifiedTime);

            const actualResponse = await testSubject.getModifiedBlobContent(containerName, blobName, modifiedTime);

            expect(actualResponse.notFound).toBe(true);
            expect(actualResponse.isModified).toBe(undefined);
            expect(actualResponse.updatedContent).toBeUndefined();
        });
    });

    function setupSuccessfulDownloadBlobCall(readableStream: NodeJS.ReadableStream, modifiedSince: Date): void {
        const response: Models.BlobDownloadResponse = ({
            readableStreamBody: readableStream,
        } as unknown) as Models.BlobDownloadResponse;

        blobClientMock
            .setup(async s =>
                s.download(0, undefined, { blobAccessConditions: { modifiedAccessConditions: { ifModifiedSince: modifiedSince } } }),
            )
            .returns(async () => {
                return response;
            });
    }

    function setupFailureDownloadBlobCall(response: unknown, modifiedSince: Date): void {
        blobClientMock
            .setup(async s =>
                s.download(0, undefined, { blobAccessConditions: { modifiedAccessConditions: { ifModifiedSince: modifiedSince } } }),
            )
            .returns(async () => Promise.reject(response));
    }

    function getReadableStreamForDataChunks(chunks: string[]): NodeJS.ReadableStream {
        const readableStream = new Stream.Readable();
        chunks.forEach(chunk => {
            readableStream.push(chunk);
        });
        readableStream.push(null);

        return readableStream;
    }

    function getErrorReadableStream(): NodeJS.ReadableStream {
        return new Stream.Readable();
    }
});
