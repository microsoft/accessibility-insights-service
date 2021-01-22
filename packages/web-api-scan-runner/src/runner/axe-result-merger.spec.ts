// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import axe, { AxeResults } from 'axe-core';
import { AxeResultsReducer } from 'axe-result-converter';
import { cloneDeep } from 'lodash';
import { CombinedScanResultsProvider, CombinedScanResultsReadResponse, CombinedScanResultsWriteResponse } from 'service-library';
import { CombinedScanResultsError, WriteErrorCode } from 'service-library/dist/data-providers/combined-scan-results-provider';
import { CombinedScanResults } from 'storage-documents';
import { IMock, It, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { AxeResultMerger } from './axe-result-merger';

describe(AxeResultMerger, () => {
    let combinedScanResultsProviderMock: IMock<CombinedScanResultsProvider>;
    let axeResultsReducerMock: IMock<AxeResultsReducer>;
    let loggerMock: IMock<MockableLogger>;
    let testSubject: AxeResultMerger;

    let combinedScanResults: CombinedScanResults;
    let combinedScanResultsBlobRead: CombinedScanResultsReadResponse;
    let axeResults: AxeResults;
    let combinedResultsBlobId: string;
    let blobReadETagStub: string;

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        combinedScanResultsProviderMock = Mock.ofType<CombinedScanResultsProvider>();
        axeResultsReducerMock = Mock.ofType<AxeResultsReducer>();

        axeResults = {
            url: 'url',
            timestamp: 'timestamp',
            passes: [],
            violations: [],
            incomplete: [],
            inapplicable: [],
        } as AxeResults;
        combinedResultsBlobId = 'combinedResultsBlobId';
        combinedScanResults = {
            urlCount: {
                total: 1,
                passed: 1,
                failed: 0,
            },
            axeResults: {},
        } as CombinedScanResults;
        blobReadETagStub = 'some-e-tag';

        testSubject = new AxeResultMerger(loggerMock.object, combinedScanResultsProviderMock.object, axeResultsReducerMock.object);
    });

    describe('Success', () => {
        test('generate combined scan results with no new violations', async () => {
            combinedScanResultsBlobRead = {
                results: { ...combinedScanResults },
                etag: blobReadETagStub,
            } as CombinedScanResultsReadResponse;

            const expectedCombinedScanResults = cloneDeep(combinedScanResults);
            expectedCombinedScanResults.urlCount.passed++;
            expectedCombinedScanResults.urlCount.total++;

            setupBlobRead(combinedResultsBlobId, combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});
            const combinedResults = await testSubject.mergeAxeResults(axeResults, combinedResultsBlobId);
            expect(combinedResults).toEqual(expectedCombinedScanResults);
        });

        test('generate combined scan results with new violations', async () => {
            combinedScanResultsBlobRead = {
                results: { ...combinedScanResults },
                etag: blobReadETagStub,
            } as CombinedScanResultsReadResponse;

            axeResults.violations = [{} as axe.Result];

            const expectedCombinedScanResults = cloneDeep(combinedScanResults);
            expectedCombinedScanResults.urlCount.failed++;
            expectedCombinedScanResults.urlCount.total++;

            setupBlobRead(combinedResultsBlobId, combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});

            const combinedResults = await testSubject.mergeAxeResults(axeResults, combinedResultsBlobId);
            expect(combinedResults).toEqual(expectedCombinedScanResults);
        });

        test('generate new scan results when no blob id provided', async () => {
            combinedScanResultsBlobRead = {
                results: { ...combinedScanResults, urlCount: { passed: 0, failed: 0, total: 0 } },
                etag: blobReadETagStub,
            } as CombinedScanResultsReadResponse;
            combinedResultsBlobId = undefined;

            const expectedCombinedScanResults = cloneDeep(combinedScanResultsBlobRead.results);
            expectedCombinedScanResults.urlCount.passed++;
            expectedCombinedScanResults.urlCount.total++;

            combinedScanResultsProviderMock.setup((m) => m.getEmptyResponse()).returns(() => combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});

            const combinedResults = await testSubject.mergeAxeResults(axeResults, combinedResultsBlobId);
            expect(combinedResults).toEqual(expectedCombinedScanResults);
        });

        test('generate new scan results when blob not found when reading', async () => {
            combinedScanResultsBlobRead = {
                results: { ...combinedScanResults, urlCount: { passed: 0, failed: 0, total: 0 } },
                etag: blobReadETagStub,
                error: {
                    errorCode: 'blobNotFound',
                },
            } as CombinedScanResultsReadResponse;

            const expectedCombinedScanResults = cloneDeep(combinedScanResultsBlobRead.results);
            expectedCombinedScanResults.urlCount.passed++;
            expectedCombinedScanResults.urlCount.total++;

            setupBlobRead(combinedResultsBlobId, combinedScanResultsBlobRead);
            combinedScanResultsProviderMock.setup((m) => m.getEmptyResponse()).returns(() => combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});

            const combinedResults = await testSubject.mergeAxeResults(axeResults, combinedResultsBlobId);
            expect(combinedResults).toEqual(expectedCombinedScanResults);
        });
    });

    describe('Error', () => {
        test('throw for when read blob error code is not blobNotFound', async () => {
            combinedScanResultsBlobRead = {
                results: { ...combinedScanResults, urlCount: { passed: 0, failed: 0, total: 0 } },
                etag: blobReadETagStub,
                error: {
                    errorCode: 'jsonParseError',
                },
            } as CombinedScanResultsReadResponse;

            const expectedCombinedScanResults = cloneDeep(combinedScanResultsBlobRead.results);
            expectedCombinedScanResults.urlCount.passed++;
            expectedCombinedScanResults.urlCount.total++;

            setupBlobRead(combinedResultsBlobId, combinedScanResultsBlobRead);
            combinedScanResultsProviderMock.setup((m) => m.getEmptyResponse()).returns(() => combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});

            await expect(testSubject.mergeAxeResults(axeResults, combinedResultsBlobId)).rejects.toThrowError(
                'Failed to read combined axe results blob.',
            );
        });

        test('throw for when error code is not blobNotFound', async () => {
            combinedScanResultsBlobRead = {
                results: { ...combinedScanResults, urlCount: { passed: 0, failed: 0, total: 0 } },
                etag: blobReadETagStub,
            } as CombinedScanResultsReadResponse;

            const expectedCombinedScanResults = cloneDeep(combinedScanResultsBlobRead.results);
            expectedCombinedScanResults.urlCount.passed++;
            expectedCombinedScanResults.urlCount.total++;

            setupBlobRead(combinedResultsBlobId, combinedScanResultsBlobRead);
            combinedScanResultsProviderMock.setup((m) => m.getEmptyResponse()).returns(() => combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {
                error: {} as CombinedScanResultsError<WriteErrorCode>,
            });

            await expect(testSubject.mergeAxeResults(axeResults, combinedResultsBlobId)).rejects.toThrowError(
                'Failed to write new combined axe scan results blob.',
            );
        });
    });

    function setupBlobWrite(
        expectedCombinedResults: CombinedScanResults,
        expectedETag: string,
        expectedCombinedResultsBlobId: string,
        responseStub: CombinedScanResultsWriteResponse,
    ) {
        combinedScanResultsProviderMock
            .setup((m) => m.writeCombinedResults(expectedCombinedResultsBlobId, It.isValue(expectedCombinedResults), expectedETag))
            .returns(() => Promise.resolve(responseStub));
    }

    function setupBlobRead(expectedCombinedResultsBlobId: string, response: CombinedScanResultsReadResponse) {
        combinedScanResultsProviderMock
            .setup((m) => m.readCombinedResults(expectedCombinedResultsBlobId))
            .returns(() => Promise.resolve(response));
    }
});
