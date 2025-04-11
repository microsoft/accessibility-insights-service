// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Readable } from 'stream';
import { BlobContentDownloadResponse, BlobSaveCondition, BlobStorageClient, BlobContentUploadResponse } from 'azure-services';
import { IMock, Mock } from 'typemoq';
import { BodyParser, System } from 'common';
import { PrivacyScanCombinedReport } from 'storage-documents';
import { DataProvidersCommon } from './data-providers-common';
import { PrivacyReportWriteResponse, PrivacyScanCombinedReportProvider } from './privacy-scan-combined-report-provider';
import { GeneratedReport } from './report-writer';

describe(PrivacyScanCombinedReportProvider, () => {
    const fileId = 'file id';
    const filePath = 'file path';
    const combinedReport = {
        status: 'Completed',
    } as PrivacyScanCombinedReport;
    const resultsString = JSON.stringify(combinedReport);
    const generatedReport: GeneratedReport = {
        content: resultsString,
        id: fileId,
        format: 'consolidated.json',
    };

    const etag = 'etag';
    const readableStream = {
        readable: true,
    } as NodeJS.ReadableStream;

    let blobStorageClientMock: IMock<BlobStorageClient>;
    let dataProvidersCommonMock: IMock<DataProvidersCommon>;
    let bodyParserMock: IMock<BodyParser>;

    let testSubject: PrivacyScanCombinedReportProvider;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType<BlobStorageClient>();
        dataProvidersCommonMock = Mock.ofType<DataProvidersCommon>();
        bodyParserMock = Mock.ofType<BodyParser>();
        dataProvidersCommonMock.setup((dp) => dp.getBlobName(fileId)).returns(() => filePath);

        testSubject = new PrivacyScanCombinedReportProvider(
            blobStorageClientMock.object,
            dataProvidersCommonMock.object,
            bodyParserMock.object,
        );
    });

    afterEach(() => {
        blobStorageClientMock.verifyAll();
    });

    describe('writeCombinedReport', () => {
        it('without etag', async () => {
            const expectedResult: PrivacyReportWriteResponse = {
                etag,
                report: {
                    reportId: fileId,
                    format: 'consolidated.json',
                    source: 'privacy-scan',
                    href: filePath,
                },
            };
            setupSave(resultsString, 200);

            const result = await testSubject.writeCombinedReport(generatedReport);

            expect(result).toEqual(expectedResult);
        });

        it('with etag', async () => {
            const expectedResult = {
                etag,
                report: {
                    reportId: fileId,
                    format: 'consolidated.json',
                    source: 'privacy-scan',
                    href: filePath,
                },
            };
            setupSave(resultsString, 200, { ifMatchEtag: etag });

            const result = await testSubject.writeCombinedReport(generatedReport, etag);

            expect(result).toEqual(expectedResult);
        });

        it('returns etagMismatch error', async () => {
            setupSave(resultsString, 412, { ifMatchEtag: etag });
            const expectedResult = {
                error: {
                    errorCode: 'etagMismatch',
                },
            };

            const result = await testSubject.writeCombinedReport(generatedReport, etag);

            expect(result).toEqual(expectedResult);
        });

        it('returns unrecognized error', async () => {
            setupSave(resultsString, 404, { ifMatchEtag: etag });

            const expectedResult = {
                error: {
                    errorCode: 'httpStatusError',
                    data: '404',
                },
            };

            const result = await testSubject.writeCombinedReport(generatedReport, etag);

            expect(result).toEqual(expectedResult);
        });
    });

    describe('readCombinedReport', () => {
        it('read combined report', async () => {
            setupReadBlob();
            setupReadStream(resultsString);
            const expectedResults = {
                results: combinedReport,
                etag: etag,
            };

            const actualResults = await testSubject.readCombinedReport(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles document not found', async () => {
            setupDocumentNotFound();
            const expectedResults = {
                error: {
                    errorCode: 'blobNotFound',
                },
            };

            const actualResults = await testSubject.readCombinedReport(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles stream read failure', async () => {
            setupReadBlob();
            const error = new Error('error');
            bodyParserMock.setup((bp) => bp.getRawBody(readableStream as Readable)).throws(error);
            const expectedResults = {
                error: {
                    errorCode: 'streamError',
                    data: System.serializeError(error),
                },
            };

            const actualResults = await testSubject.readCombinedReport(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles unparsable string', async () => {
            const unparsableString = '{ unparsable content string';
            setupReadBlob();
            setupReadStream(unparsableString);

            const actualResults = await testSubject.readCombinedReport(fileId);

            expect(actualResults.error.errorCode).toEqual('jsonParseError');
            expect(actualResults.error.data).toContain(`JSON at position 2`);
        });
    });

    function setupReadStream(content: string): void {
        bodyParserMock.setup((bp) => bp.getRawBody(readableStream as Readable)).returns(() => Promise.resolve(Buffer.from(content)));
    }

    function setupReadBlob(): void {
        const response = {
            notFound: false,
            content: readableStream,
            etag: etag,
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup((bc) => bc.getBlobContent(DataProvidersCommon.reportBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
    }

    function setupDocumentNotFound(): void {
        const response = {
            notFound: true,
            content: null,
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup((bc) => bc.getBlobContent(DataProvidersCommon.reportBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
    }

    function setupSave(content: string, statusCode: number, condition?: BlobSaveCondition): void {
        const response = { statusCode, etag } as BlobContentUploadResponse;
        blobStorageClientMock
            .setup((bc) => bc.uploadBlobContent(DataProvidersCommon.reportBlobContainerName, filePath, content, condition))
            .returns(() => Promise.resolve(response))
            .verifiable();
    }
});
