// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Readable } from 'stream';
import { BlobContentDownloadResponse, BlobSaveCondition, BlobStorageClient, BlobContentUploadResponse } from 'azure-services';
import { CombinedAxeResults, CombinedScanResults } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { AxeResults } from 'axe-result-converter';
import { BodyParser } from 'common';
import { CombinedScanResultsProvider } from './combined-scan-results-provider';
import { DataProvidersCommon } from './data-providers-common';

describe(CombinedScanResultsProvider, () => {
    const fileId = 'file id';
    const filePath = 'file path';
    const combinedResults = {
        urlCount: {
            passed: 1,
            failed: 2,
            total: 3,
        },
        axeResults: {},
    } as CombinedScanResults;
    const resultsString = JSON.stringify(combinedResults);

    const emptyResults = {
        urlCount: {
            failed: 0,
            passed: 0,
            total: 0,
        },
        axeResults: {
            urls: [],
            violations: new AxeResults().serialize(),
            passes: new AxeResults().serialize(),
            incomplete: new AxeResults().serialize(),
            inapplicable: new AxeResults().serialize(),
        } as CombinedAxeResults,
    };
    const emptyResultsString = JSON.stringify(emptyResults);
    const etag = 'etag';
    const readableStream = {
        readable: true,
    } as NodeJS.ReadableStream;

    let blobStorageClientMock: IMock<BlobStorageClient>;
    let dataProvidersCommonMock: IMock<DataProvidersCommon>;
    let bodyParserMock: IMock<BodyParser>;

    let testSubject: CombinedScanResultsProvider;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType<BlobStorageClient>();
        dataProvidersCommonMock = Mock.ofType<DataProvidersCommon>();
        bodyParserMock = Mock.ofType<BodyParser>();
        dataProvidersCommonMock.setup((dp) => dp.getBlobName(fileId)).returns(() => filePath);

        testSubject = new CombinedScanResultsProvider(blobStorageClientMock.object, dataProvidersCommonMock.object, bodyParserMock.object);
    });

    afterEach(() => {
        blobStorageClientMock.verifyAll();
    });

    describe('saveCombinedResults', () => {
        it('without etag', async () => {
            setupSave(resultsString, 200);
            const expectedResult = { etag };

            const result = await testSubject.saveCombinedResults(fileId, combinedResults);

            expect(result).toEqual(expectedResult);
        });

        it('with etag', async () => {
            setupSave(resultsString, 200, { ifMatchEtag: etag });
            const expectedResult = { etag };

            const result = await testSubject.saveCombinedResults(fileId, combinedResults, etag);

            expect(result).toEqual(expectedResult);
        });

        it('returns etagMismatch error', async () => {
            setupSave(resultsString, 412, { ifMatchEtag: etag });
            const expectedResult = {
                error: {
                    errorCode: 'etagMismatch',
                },
            };

            const result = await testSubject.saveCombinedResults(fileId, combinedResults, etag);

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

            const result = await testSubject.saveCombinedResults(fileId, combinedResults, etag);

            expect(result).toEqual(expectedResult);
        });
    });

    describe('readCombinedResults', () => {
        it('Read combined results', async () => {
            setupReadBlob();
            setupReadStream(resultsString);
            const expectedResults = {
                results: combinedResults,
                etag: etag,
            };

            const actualResults = await testSubject.readCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles document not found', async () => {
            setupDocumentNotFound();
            const expectedResults = {
                error: {
                    errorCode: 'documentNotFound',
                },
            };

            const actualResults = await testSubject.readCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles stream read failure', async () => {
            setupReadBlob();
            const error = new Error('error');
            bodyParserMock.setup((bp) => bp.getRawBody(readableStream as Readable)).throws(error);
            const expectedResults = {
                error: {
                    errorCode: 'streamError',
                    data: JSON.stringify(error),
                },
            };

            const actualResults = await testSubject.readCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('handles unparsable string', async () => {
            const unparsableString = '{ unparsable content string';
            setupReadBlob();
            setupReadStream(unparsableString);
            const expectedResults = {
                error: {
                    errorCode: 'JSONParseError',
                    data: unparsableString,
                },
            };

            const actualResults = await testSubject.readCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });
    });

    describe('createCombinedResults', () => {
        it('returns error if results already exist', async () => {
            setupReadBlob();
            setupReadStream(resultsString);
            const expectedResults = {
                error: {
                    errorCode: 'documentAlreadyExists',
                },
            };

            const actualResults = await testSubject.createCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('creates results if none exist', async () => {
            setupDocumentNotFound();
            setupSave(emptyResultsString, 200);
            const expectedResults = {
                results: emptyResults,
                etag: etag,
            };

            const actualResults = await testSubject.createCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
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
            .setup((bc) => bc.getBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
    }

    function setupDocumentNotFound(): void {
        const response = {
            notFound: true,
            content: null,
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup((bc) => bc.getBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
    }

    function setupSave(content: string, statusCode: number, condition?: BlobSaveCondition): void {
        const response = { statusCode, etag } as BlobContentUploadResponse;
        blobStorageClientMock
            .setup((bc) => bc.uploadBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath, content, condition))
            .returns(() => Promise.resolve(response))
            .verifiable();
    }
});
