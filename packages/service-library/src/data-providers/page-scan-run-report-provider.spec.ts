// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Readable } from 'stream';
import { BlobContentDownloadResponse, BlobStorageClient } from 'azure-services';
import { IMock, Mock } from 'typemoq';
import { BodyParser, System } from 'common';
import { ValidationScanResults } from 'scanner-global-library';
import { DataProvidersCommon } from './data-providers-common';
import { PageScanRunReportProvider } from './page-scan-run-report-provider';

/* eslint-disable @typescript-eslint/no-explicit-any */

let testSubject: PageScanRunReportProvider;
let blobStorageClientMock: IMock<BlobStorageClient>;
let dataProvidersCommonMock: IMock<DataProvidersCommon>;
let bodyParserMock: IMock<BodyParser>;

const time = new Date(2019, 2, 1, 10, 20, 30);
const etag = 'etag';
const fileId = 'fileId';
const blobFilePath = `${time.getUTCFullYear()}/${time.getUTCMonth() + 1}/${time.getUTCDate()}/${time.getUTCHours()}/${fileId}`;
const readableStream = {
    readable: true,
} as NodeJS.ReadableStream;
const validationScanResults = {
    scannedUrl: 'scannedUrl',
    pageTitle: 'pageTitle',
    validationResults: {
        url: 'url',
        passes: [{ id: 'aria-allowed-attr', impact: null }],
        violations: [{ id: 'frame-title', impact: 'serious' }],
        incomplete: [{ id: 'color-contrast', impact: 'serious' }],
        inapplicable: [{ id: 'area-alt', impact: null }],
    } as any,
} as ValidationScanResults;
const resultsString = JSON.stringify(validationScanResults);

describe(PageScanRunReportProvider, () => {
    beforeEach(() => {
        blobStorageClientMock = Mock.ofType(BlobStorageClient);
        dataProvidersCommonMock = Mock.ofType(DataProvidersCommon);
        bodyParserMock = Mock.ofType<BodyParser>();
        dataProvidersCommonMock
            .setup((o) => o.getBlobName(fileId))
            .returns(() => blobFilePath)
            .verifiable();

        testSubject = new PageScanRunReportProvider(blobStorageClientMock.object, dataProvidersCommonMock.object, bodyParserMock.object);
    });

    afterEach(() => {
        dataProvidersCommonMock.verifyAll();
        blobStorageClientMock.verifyAll();
    });

    it('save report', async () => {
        const blobContent = 'blob content1';

        blobStorageClientMock
            .setup(async (b) => b.uploadBlobContent(DataProvidersCommon.reportBlobContainerName, blobFilePath, blobContent))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        expect(await testSubject.saveReport(fileId, blobContent)).toEqual(blobFilePath);
    });

    it('read report', async () => {
        const expectedResponse: BlobContentDownloadResponse = { content: 'blob content1' as any, notFound: false };

        blobStorageClientMock
            .setup(async (b) => b.getBlobContent(DataProvidersCommon.reportBlobContainerName, blobFilePath))
            .returns(async () => Promise.resolve(expectedResponse))
            .verifiable();

        await expect(testSubject.readReport(fileId)).resolves.toBe(expectedResponse);
    });

    describe('readReportContent()', () => {
        it('read report content', async () => {
            setupReadBlob();
            setupReadStream(resultsString);
            const expectedResults = {
                content: validationScanResults,
                etag: etag,
            };

            const actualResults = await testSubject.readReportContent(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles blob not found', async () => {
            setupDocumentNotFound();
            const expectedResults = {
                errorCode: 'blobNotFound',
            };

            const actualResults = await testSubject.readReportContent(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles blob stream read failure', async () => {
            setupReadBlob();
            const error = new Error('error');
            bodyParserMock.setup((o) => o.getRawBody(readableStream as Readable)).throws(error);
            const expectedResults = {
                errorCode: 'streamError',
                error: System.serializeError(error),
            };

            const actualResults = await testSubject.readReportContent(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles JSON parsing error', async () => {
            const invalidContent = '{ invalid content string';
            setupReadBlob();
            setupReadStream(invalidContent);

            const actualResults = await testSubject.readReportContent(fileId);

            expect(actualResults.errorCode).toEqual('jsonParseError');
            expect(actualResults.error).toContain(`in JSON at position 2`);
        });
    });
});

function setupReadStream(content: string): void {
    bodyParserMock.setup((o) => o.getRawBody(readableStream as Readable)).returns(() => Promise.resolve(Buffer.from(content)));
}

function setupReadBlob(): void {
    const response = {
        notFound: false,
        content: readableStream,
        etag: etag,
    } as BlobContentDownloadResponse;
    blobStorageClientMock
        .setup((o) => o.getBlobContent(DataProvidersCommon.reportBlobContainerName, blobFilePath))
        .returns(async () => response)
        .verifiable();
}

function setupDocumentNotFound(): void {
    const response = {
        notFound: true,
        content: null,
    } as BlobContentDownloadResponse;
    blobStorageClientMock
        .setup((o) => o.getBlobContent(DataProvidersCommon.reportBlobContainerName, blobFilePath))
        .returns(async () => response)
        .verifiable();
}
