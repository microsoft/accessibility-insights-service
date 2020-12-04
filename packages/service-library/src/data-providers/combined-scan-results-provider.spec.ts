// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { BlobContentDownloadResponse, BlobSaveCondition, BlobStorageClient } from 'azure-services';
import { CombinedAxeResults, CombinedScanResults } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { AxeResults } from 'axe-result-converter';
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

    let blobStorageClientMock: IMock<BlobStorageClient>;
    let dataProvidersCommonMock: IMock<DataProvidersCommon>;

    let testSubject: CombinedScanResultsProvider;

    beforeEach(() => {
        blobStorageClientMock = Mock.ofType<BlobStorageClient>();
        dataProvidersCommonMock = Mock.ofType<DataProvidersCommon>();
        dataProvidersCommonMock.setup(dp => dp.getBlobName(fileId)).returns(() => filePath);

        testSubject = new CombinedScanResultsProvider(blobStorageClientMock.object, dataProvidersCommonMock.object);
    });

    afterEach(() => {
        blobStorageClientMock.verifyAll();
    });

    describe('saveCombinedResults', () => {
        it('without etag', async () => {
            setupSave(resultsString);

            const resultFilePath = await testSubject.saveCombinedResults(fileId, combinedResults);

            expect(resultFilePath).toBe(filePath);
        });

        it('with etag', async () => {
            setupSave(resultsString, { ifMatchEtag: etag });

            const resultFilePath = await testSubject.saveCombinedResults(fileId, combinedResults, etag);

            expect(resultFilePath).toBe(filePath);
        });
    });

    describe('readCombinedResults', () => {
        it('Read combined results', async () => {
            setupRead(resultsString);
            const expectedResults = {
                results: combinedResults,
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

        it('handles unparsable string', async () => {
            const unparsableString = '{ unparsable content string';
            setupRead(unparsableString);
            const expectedResults = {
                error: {
                    errorCode: 'parseError',
                    data: unparsableString,
                },
            };

            const actualResults = await testSubject.readCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });
    });

    describe('readOrCreateCombinedResults', () => {
        it('results exist', async () => {
            setupRead(resultsString);
            const expectedResults = {
                results: combinedResults,
            };

            const actualResults = await testSubject.readOrCreateCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('results exist but cannot be parsed', async () => {
            const unparsableString = '{ unparsable content string';
            setupRead(unparsableString);
            const expectedResults = {
                error: {
                    errorCode: 'parseError',
                    data: unparsableString,
                },
            };

            const actualResults = await testSubject.readOrCreateCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });

        it('creates results if none exist', async () => {
            setupDocumentNotFound();
            setupSave(emptyResultsString);
            const expectedResults = {
                results: emptyResults,
            };

            const actualResults = await testSubject.readOrCreateCombinedResults(fileId);

            expect(actualResults).toEqual(expectedResults);
        });
    });

    function stubReadableStream(content: string): NodeJS.ReadableStream {
        return {
            read: () => content,
        } as unknown as NodeJS.ReadableStream;
    }

    function setupRead(content: string): void {
        const response = {
            notFound: false,
            content: stubReadableStream(content),
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup(bc => bc.getBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
    }

    function setupDocumentNotFound(): void {
        const response = {
            notFound: true,
            content: null,
        } as BlobContentDownloadResponse;
        blobStorageClientMock
            .setup(bc => bc.getBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath))
            .returns(async () => response)
            .verifiable();
    }

    function setupSave(content: string, condition?: BlobSaveCondition): void {
        blobStorageClientMock
            .setup(bc => bc.uploadBlobContent(DataProvidersCommon.combinedResultsBlobContainerName, filePath, content, condition))
            .verifiable();
    }
});

