// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { AxeResultsReducer } from 'axe-result-converter';
import { cloneDeep } from 'lodash';
import { CombinedScanResults, PageScan } from 'storage-documents';
import { IMock, It, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import {
    CombinedScanResultsProvider,
    CombinedScanResultsReadResponse,
    CombinedScanResultsWriteResponse,
} from '../data-providers/combined-scan-results-provider';
import { CombinedAxeResultBuilder } from './combined-axe-result-builder';
import { CombinedResultsBlob } from './combined-results-blob-provider';

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
    let pageScans: PageScan[];

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        combinedScanResultsProviderMock = Mock.ofType<CombinedScanResultsProvider>();
        axeResultsReducerMock = Mock.ofType<AxeResultsReducer>();

        pageScans = [
            {
                scanState: 'pass',
            },
            {
                scanState: 'pass',
            },
            {
                scanState: 'fail',
            },
            {
                scanState: 'pending',
            },
        ] as PageScan[];
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
            const failed = pageScans.filter((s) => s?.scanState === 'fail').length;
            const passed = pageScans.filter((s) => s?.scanState === 'pass').length;
            expectedCombinedScanResults.urlCount = {
                total: passed + failed,
                failed,
                passed,
            };

            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {});
            const combinedResults = await testSubject.mergeAxeResults(axeResults, combinedResultsBlobInfoStub, pageScans);
            expect(combinedResults).toEqual(expectedCombinedScanResults);
        });
    });

    describe('Error', () => {
        test('throw for when writing blob fails', async () => {
            const expectedCombinedScanResults = cloneDeep(combinedScanResultsBlobRead.results);
            expectedCombinedScanResults.urlCount = {
                total: 3,
                failed: 1,
                passed: 2,
            };

            combinedScanResultsProviderMock.setup((m) => m.getEmptyResponse()).returns(() => combinedScanResultsBlobRead);
            setupBlobWrite(expectedCombinedScanResults, blobReadETagStub, combinedResultsBlobId, {
                error: {} as any,
            });

            await expect(testSubject.mergeAxeResults(axeResults, combinedResultsBlobInfoStub, pageScans)).rejects.toThrowError(
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
