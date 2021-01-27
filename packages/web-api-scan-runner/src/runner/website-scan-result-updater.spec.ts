// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { RetryHelper } from 'common';
import { WebsiteScanResultProvider } from 'service-library';
import { IMock, Mock, It, Times } from 'typemoq';
import {
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    ItemType,
    WebsiteScanRef,
    WebsiteScanResult,
    CombinedScanResults,
    OnDemandPageScanReport,
} from 'storage-documents';
import { AxeResults } from 'axe-core';
import { AxeScanResults } from 'scanner-global-library';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { GeneratedReport } from '../report-generator/report-generator';
import { AxeResultMerger } from './axe-result-merger';
import { CombinedReportGenerator } from './combined-report-generator';
import { CombinedResultsBlobGetter, CombinedResultsBlobInfo } from './combined-results-blob-getter';
import { ReportSaver } from './report-saver';
import { UrlDeduplicator } from './url-deduplicator';
import { WebsiteScanResultUpdater } from './website-scan-result-updater';

describe(WebsiteScanResultUpdater, () => {
    let loggerMock: IMock<MockableLogger>;
    let websiteScanResultsProviderMock: IMock<WebsiteScanResultProvider>;
    let retryHelperMock: IMock<RetryHelper<void>>;
    let axeResultMergerMock: IMock<AxeResultMerger>;
    let combinedReportGeneratorMock: IMock<CombinedReportGenerator>;
    let reportSaverMock: IMock<ReportSaver>;
    let combinedResultsBlobGetterMock: IMock<CombinedResultsBlobGetter>;
    let urlDeduplicatorMock: IMock<UrlDeduplicator>;

    let testSubject: WebsiteScanResultUpdater;

    let onDemandPageScanResult: OnDemandPageScanResult;
    let websiteScanRefs: WebsiteScanRef[];
    let websiteScanId: string;
    let etagStub: string;
    let websiteScanResultReadResponse: WebsiteScanResult;

    beforeEach(() => {
        loggerMock = Mock.ofType<MockableLogger>();
        retryHelperMock = Mock.ofType<RetryHelper<void>>();
        websiteScanResultsProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        axeResultMergerMock = Mock.ofType<AxeResultMerger>();
        combinedReportGeneratorMock = Mock.ofType<CombinedReportGenerator>();
        reportSaverMock = Mock.ofType<ReportSaver>();
        combinedResultsBlobGetterMock = Mock.ofType<CombinedResultsBlobGetter>();
        urlDeduplicatorMock = Mock.ofType<UrlDeduplicator>();

        testSubject = new WebsiteScanResultUpdater(
            loggerMock.object,
            retryHelperMock.object,
            websiteScanResultsProviderMock.object,
            axeResultMergerMock.object,
            combinedReportGeneratorMock.object,
            reportSaverMock.object,
            combinedResultsBlobGetterMock.object,
            urlDeduplicatorMock.object,
        );

        onDemandPageScanResult = {
            url: 'url',
            scanResult: null,
            reports: [],
            run: {
                state: 'queued' as OnDemandPageScanRunState,
                timestamp: 'timestamp',
            },
            priority: 1,
            itemType: ItemType.onDemandPageScanRunResult,
            id: 'id',
            partitionKey: 'item-partitionKey',
            batchRequestId: 'batch-id',
        };
        websiteScanId = 'websiteScanId';
        etagStub = 'some-etag';
        websiteScanResultReadResponse = {
            id: websiteScanId,
            _etag: etagStub,
        } as WebsiteScanResult;
    });

    describe('generateCombinedScanResults', () => {
        let axeResultsStub: AxeScanResults;
        beforeEach(() => {
            axeResultsStub = {
                browserResolution: 'some-resolution',
                userAgent: 'some-user-agent',
                results: {
                    url: 'some-url',
                } as AxeResults,
            };
        });

        const noWebsiteScanRefCases: WebsiteScanRef[][] = [undefined, []];
        noWebsiteScanRefCases.forEach((testCase) => {
            test(`page scan result website scan refs is ${testCase}`, async () => {
                setupRetryHelperMock();
                onDemandPageScanResult.websiteScanRefs = testCase;

                websiteScanResultsProviderMock.setup((m) => m.read(It.isAny())).verifiable(Times.never());

                await testSubject.generateCombinedScanResults(axeResultsStub, onDemandPageScanResult);

                websiteScanResultsProviderMock.verifyAll();
            });
        });

        describe('consolidated-scan-report scan ref exists', () => {
            let combinedResultsBlobId: string;
            let combinedResultsBlobInfoStub: CombinedResultsBlobInfo;
            let combinedAxeResultsStub: CombinedScanResults;
            let generatedReportStub: GeneratedReport;
            let onDemandPageScanResultStub: OnDemandPageScanReport;

            beforeEach(() => {
                combinedResultsBlobId = 'some-results-blob-id';
                websiteScanResultReadResponse.combinedResultsBlobId = combinedResultsBlobId;
                combinedResultsBlobInfoStub = {
                    blobId: combinedResultsBlobId,
                } as CombinedResultsBlobInfo;
                combinedAxeResultsStub = { urlCount: { passed: 1 } } as CombinedScanResults;
                generatedReportStub = { id: 'some-generated-report-id' } as GeneratedReport;
                onDemandPageScanResultStub = { reportId: 'some-on-demand-result-id' } as OnDemandPageScanReport;
                websiteScanRefs = [{ id: websiteScanId, scanGroupType: 'consolidated-scan-report' }] as WebsiteScanRef[];
                onDemandPageScanResult.websiteScanRefs = websiteScanRefs;

                websiteScanResultsProviderMock
                    .setup((m) => m.read(websiteScanId))
                    .returns(() => Promise.resolve(websiteScanResultReadResponse));
                combinedResultsBlobGetterMock
                    .setup((m) => m.getBlobInfo(combinedResultsBlobId))
                    .returns(() => Promise.resolve(combinedResultsBlobInfoStub));
                axeResultMergerMock
                    .setup((m) => m.mergeAxeResults(axeResultsStub.results, combinedResultsBlobInfoStub))
                    .returns(() => Promise.resolve(combinedAxeResultsStub));
                combinedReportGeneratorMock
                    .setup((m) =>
                        m.generate(
                            combinedAxeResultsStub,
                            websiteScanResultReadResponse,
                            axeResultsStub.userAgent,
                            axeResultsStub.browserResolution,
                        ),
                    )
                    .returns(() => generatedReportStub);
            });

            test('successfully update website scan result', async () => {
                reportSaverMock.setup((m) => m.save(generatedReportStub)).returns(() => Promise.resolve(onDemandPageScanResultStub));
                const expectedWebsiteScanResult: Partial<WebsiteScanResult> = {
                    id: websiteScanId,
                    _etag: etagStub,
                    reports: [onDemandPageScanResultStub],
                    combinedResultsBlobId: combinedResultsBlobId,
                };

                setupRetryHelperMock();

                websiteScanResultsProviderMock.setup((m) => m.mergeOrCreate(It.isValue(expectedWebsiteScanResult))).verifiable();

                await testSubject.generateCombinedScanResults(axeResultsStub, onDemandPageScanResult);

                expect(onDemandPageScanResult.reports).toContain(onDemandPageScanResultStub);
                websiteScanResultsProviderMock.verifyAll();
            });

            test('successfully update website scan result but report is null', async () => {
                reportSaverMock.setup((m) => m.save(generatedReportStub)).returns(() => Promise.resolve(null));
                const expectedWebsiteScanResult: Partial<WebsiteScanResult> = {
                    id: websiteScanId,
                    _etag: etagStub,
                    reports: [null],
                    combinedResultsBlobId: combinedResultsBlobId,
                };

                setupRetryHelperMock();

                websiteScanResultsProviderMock.setup((m) => m.mergeOrCreate(It.isValue(expectedWebsiteScanResult))).verifiable();

                await testSubject.generateCombinedScanResults(axeResultsStub, onDemandPageScanResult);

                expect(onDemandPageScanResult.reports).toEqual([]);
                websiteScanResultsProviderMock.verifyAll();
            });

            test('unsuccessfully update website scan result; throws error', async () => {
                setupRetryHelperMock();
                websiteScanResultsProviderMock.setup((m) => m.mergeOrCreate(It.isAny())).throws(new Error());

                await expect(testSubject.generateCombinedScanResults(axeResultsStub, onDemandPageScanResult)).rejects.toThrowError(
                    'Failed to update website scan results',
                );
            });
        });
    });

    describe('updateWebsiteScanResultWithDiscoveredUrls', () => {
        const noWebsiteScanRefCases: WebsiteScanRef[][] = [undefined, []];
        noWebsiteScanRefCases.forEach((testCase) => {
            test(`page scan result website scan refs is ${testCase}`, async () => {
                setupRetryHelperMock();
                onDemandPageScanResult.websiteScanRefs = testCase;

                websiteScanResultsProviderMock.setup((m) => m.read(It.isAny())).verifiable(Times.never());

                await testSubject.updateWebsiteScanResultWithDiscoveredUrls(onDemandPageScanResult, []);

                websiteScanResultsProviderMock.verifyAll();
            });
        });

        describe('deep-scan scan ref exists', () => {
            let newlyDiscoveredUrls: string[];
            let knownPages: string[];
            let expectedKnownPages: string[];

            beforeEach(() => {
                newlyDiscoveredUrls = ['some-url'];
                knownPages = ['some-other-url'];
                websiteScanResultReadResponse.knownPages = knownPages;
                expectedKnownPages = [...newlyDiscoveredUrls, ...knownPages];
                websiteScanRefs = [{ id: websiteScanId, scanGroupType: 'deep-scan' }] as WebsiteScanRef[];
                onDemandPageScanResult.websiteScanRefs = websiteScanRefs;

                websiteScanResultsProviderMock
                    .setup((m) => m.read(websiteScanId))
                    .returns(() => Promise.resolve(websiteScanResultReadResponse));
                urlDeduplicatorMock.setup((m) => m.dedupe(knownPages, newlyDiscoveredUrls)).returns(() => expectedKnownPages);
            });

            test('successfully update website scan result', async () => {
                const expectedWebsiteScanResult: Partial<WebsiteScanResult> = {
                    id: websiteScanId,
                    _etag: etagStub,
                    knownPages: expectedKnownPages,
                };

                setupRetryHelperMock();

                websiteScanResultsProviderMock.setup((m) => m.mergeOrCreate(It.isValue(expectedWebsiteScanResult))).verifiable();

                await testSubject.updateWebsiteScanResultWithDiscoveredUrls(onDemandPageScanResult, newlyDiscoveredUrls);

                websiteScanResultsProviderMock.verifyAll();
            });

            test('unsuccessfully update website scan result; throws error', async () => {
                setupRetryHelperMock();
                websiteScanResultsProviderMock.setup((m) => m.mergeOrCreate(It.isAny())).throws(new Error());

                await expect(
                    testSubject.updateWebsiteScanResultWithDiscoveredUrls(onDemandPageScanResult, newlyDiscoveredUrls),
                ).rejects.toThrowError('Failed to update website scan results');
            });
        });
    });

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup((o) => o.executeWithRetries(It.isAny(), It.isAny(), 2, 1000))
            .returns(async (action: () => Promise<void>, errorHandler: (err: Error) => Promise<void>, retryCount: number) => {
                try {
                    await action();
                } catch (error) {
                    await errorHandler(error);
                    throw error;
                }
            })
            .verifiable();
    }
});
