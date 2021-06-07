// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import axe, { AxeResults } from 'axe-core';
import { AxeResultsReducer } from 'axe-result-converter';
import { cloneDeep } from 'lodash';
import { CombinedScanResultsProvider, CombinedScanResultsReadResponse, CombinedScanResultsWriteResponse } from 'service-library';
import { CombinedScanResults } from 'storage-documents';
import { IMock, It, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { CombinedResultsBlob } from '../types/combined-results-blob';
import { CombinedAxeResultBuilder } from './combined-axe-result-builder';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(CombinedAxeResultBuilder, () => {
    let combinedScanResultsProviderMock: IMock<CombinedScanResultsProvider>;
    let axeResultsReducerMock: IMock<AxeResultsReducer>;
    let loggerMock: IMock<MockableLogger>;
    let testSubject: CombinedAxeResultBuilder;

    let combinedScanResults: CombinedScanResults;
    let combinedScanResultsBlobRead: CombinedScanResultsReadResponse;
    let axeResults: AxeResults;
    let combinedResultsBlobId: string;
    let blobReadETagStub: string;
    let combinedResultsBlobInfoStub: CombinedResultsBlob;

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
        combinedScanResultsBlobRead = {
            results: combinedScanResults,
            etag: blobReadETagStub,
        } as CombinedScanResultsReadResponse;
        combinedResultsBlobInfoStub = {
            blobId: combinedResultsBlobId,
            response: combinedScanResultsBlobRead,
        };

        testSubject = new CombinedAxeResultBuilder(axeResultsReducerMock.object, combinedScanResultsProviderMock.object, loggerMock.object);
    });

    describe('Success', () => {
        test('generate combined scan results with no new violations', async () => {
            const expectedCombinedScanResults = cloneDeep(combinedScanResults);
            expectedCombinedScanResults.urlCount.passed++;
            expectedCombinedScanResults.urlCount.total++;

            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});
            const combinedResults = await testSubject.mergeAxeResults(axeResults, combinedResultsBlobInfoStub);
            expect(combinedResults).toEqual(expectedCombinedScanResults);
        });

        test('generate combined scan results with new violations', async () => {
            axeResults.violations = [{} as axe.Result];

            const expectedCombinedScanResults = cloneDeep(combinedScanResults);
            expectedCombinedScanResults.urlCount.failed++;
            expectedCombinedScanResults.urlCount.total++;

            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});

            const combinedResults = await testSubject.mergeAxeResults(axeResults, combinedResultsBlobInfoStub);
            expect(combinedResults).toEqual(expectedCombinedScanResults);
        });
    });

    describe('Error', () => {
        test('throw for when writing blob fails', async () => {
            const expectedCombinedScanResults = cloneDeep(combinedScanResultsBlobRead.results);
            expectedCombinedScanResults.urlCount.passed++;
            expectedCombinedScanResults.urlCount.total++;

            combinedScanResultsProviderMock.setup((m) => m.getEmptyResponse()).returns(() => combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {
                error: {} as any,
            });

            await expect(testSubject.mergeAxeResults(axeResults, combinedResultsBlobInfoStub)).rejects.toThrowError(
                'Failed to write new combined axe scan results blob.',
            );
        });
    });

    function setupBlobWrite(
        expectedCombinedResults: CombinedScanResults,
        expectedETag: string,
        expectedCombinedResultsBlobId: string,
        responseStub: CombinedScanResultsWriteResponse,
    ): void {
        combinedScanResultsProviderMock
            .setup((m) => m.writeCombinedResults(expectedCombinedResultsBlobId, It.isValue(expectedCombinedResults), expectedETag))
            .returns(() => Promise.resolve(responseStub));
    }
});
