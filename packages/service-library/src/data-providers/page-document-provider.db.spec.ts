// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-unsafe-any no-null-keyword no-object-literal-type-assertion
import 'reflect-metadata';

import { CosmosContainerClient } from 'azure-services';
import { ScanRunTimeConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import * as moment from 'moment';
import { RunState, Website, WebsitePage } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import * as dbHelper from '../test-utilities/db-mock-helpers';
import { PageDocumentProvider } from './page-document-provider';

// tslint:disable-next-line: mocha-no-side-effect-code
const unMockedMoment = jest.requireActual('moment') as typeof moment;
const currentTime = '2019-01-01';

jest.mock('moment', () => {
    return () => {
        return {
            subtract: (amount: moment.DurationInputArg1, unit: moment.unitOfTime.DurationConstructor) =>
                unMockedMoment(currentTime).subtract(amount, unit),
        } as moment.Moment;
    };
});

describe(PageDocumentProvider, () => {
    it('no-op', () => {
        // this test exists to have at least 1 test in the test suite to avoid jest failure, when db test run is not supported.
    });

    // tslint:disable-next-line: mocha-no-side-effect-code
    if (dbHelper.isDbTestSupported()) {
        const currentMoment = () => moment(currentTime);

        let loggerMock: IMock<Logger>;
        let serviceConfigMock: IMock<ServiceConfiguration>;
        let scanConfig: ScanRunTimeConfig;
        let testSubject: PageDocumentProvider;
        let website: Website;
        let afterLastReferenceSeenTime: string;
        let afterRescanIntervalTime: string;
        let beforeRescanIntervalTime: string;
        let afterFailedPageRescanIntervalTime: string;
        let beforeFailedPageRescanIntervalTime: string;
        let beforeLastReferenceSeenTime: string;

        beforeAll(async () => {
            await dbHelper.init('test-db', 'page-tests-collection');
        }, 30000);

        beforeEach(() => {
            scanConfig = {
                pageRescanIntervalInDays: 2,
                failedPageRescanIntervalInHours: 3,
                maxScanRetryCount: 4,
                minLastReferenceSeenInDays: 5,
                accessibilityRuleExclusionList: [],
            };
            serviceConfigMock = Mock.ofType(ServiceConfiguration);
            serviceConfigMock.setup(async s => s.getConfigValue('scanConfig')).returns(async () => scanConfig);

            website = dbHelper.createWebsiteDocument({ websiteId: dbHelper.createRandomString('websiteId') });
            loggerMock = Mock.ofType<Logger>();
            const cosmosContainerClient = new CosmosContainerClient(
                dbHelper.cosmosClient,
                dbHelper.dbContainer.dbName,
                dbHelper.dbContainer.collectionName,
                loggerMock.object,
            );

            beforeLastReferenceSeenTime = currentMoment()
                .subtract(scanConfig.minLastReferenceSeenInDays + 1, 'day')
                .toJSON();

            afterLastReferenceSeenTime = currentMoment()
                .subtract(scanConfig.minLastReferenceSeenInDays - 1, 'day')
                .toJSON();

            afterRescanIntervalTime = currentMoment()
                .subtract(scanConfig.pageRescanIntervalInDays + 1, 'day')
                .toJSON();

            beforeRescanIntervalTime = currentMoment()
                .subtract(scanConfig.pageRescanIntervalInDays - 1, 'hour')
                .toJSON();

            afterFailedPageRescanIntervalTime = currentMoment()
                .subtract(scanConfig.failedPageRescanIntervalInHours + 1, 'hour')
                .toJSON();
            beforeFailedPageRescanIntervalTime = currentMoment()
                .subtract(scanConfig.failedPageRescanIntervalInHours - 1, 'hour')
                .toJSON();

            testSubject = new PageDocumentProvider(serviceConfigMock.object, cosmosContainerClient);
        });

        function createPageWithLastRunInfo(
            site: Website,
            lastRun: any,
            lastReferenceSeen: string,
            label: string,
            basePage = true,
        ): WebsitePage {
            const page = createPageWithoutLastRunInfo(site, lastReferenceSeen, label, basePage);
            page.lastRun = lastRun;

            return page;
        }

        function createPageWithoutLastRunInfo(site: Website, lastReferenceSeen: string, label: string, basePage = true): WebsitePage {
            return dbHelper.createPageDocument({
                label: label,
                websiteId: site.websiteId,
                extra: {
                    lastReferenceSeen: lastReferenceSeen,
                    basePage: basePage,
                },
            });
        }

        function verifyQueryResultsWithoutOrder(expectedQueryResults: WebsitePage[], actualResults: WebsitePage[]): void {
            const actualResultProjections = dbHelper.getDocumentProjections(actualResults);
            const expectedQueryResultProjections = dbHelper.getDocumentProjections(expectedQueryResults);

            expect(new Set(actualResultProjections)).toEqual(new Set(expectedQueryResultProjections));
        }

        function verifyQueryResultsWithOrder(expectedQueryResults: WebsitePage[], actualResults: WebsitePage[]): void {
            const actualResultProjections = dbHelper.getDocumentProjections(actualResults);
            const expectedQueryResultProjections = dbHelper.getDocumentProjections(expectedQueryResults);

            expect(actualResultProjections).toEqual(expectedQueryResultProjections);
        }

        function setupDeepScanningWebsite(deepScanning: boolean): void {
            website.deepScanningEnabled = deepScanning;
        }

        describe('getPagesNeverScanned', () => {
            it('returns results after min lastReference date', async () => {
                let queryResults: WebsitePage[];
                const pageAfterMinLastReferenceSeen1 = createPageWithoutLastRunInfo(
                    website,
                    afterLastReferenceSeenTime,
                    'after lastReferenceSeen date 1',
                );
                const pageAfterMinLastReferenceSeen2 = createPageWithoutLastRunInfo(
                    website,
                    unMockedMoment(afterLastReferenceSeenTime)
                        .add(1, 'hour')
                        .toJSON(),
                    'after lastReferenceSeen date 2',
                );
                const pageBeforeMinLastReferenceSeen = createPageWithoutLastRunInfo(
                    website,
                    beforeLastReferenceSeenTime,
                    'before lastReferenceSeen date',
                );

                await dbHelper.upsertItems([
                    pageAfterMinLastReferenceSeen1,
                    pageBeforeMinLastReferenceSeen,
                    pageAfterMinLastReferenceSeen2,
                ]);
                queryResults = [pageAfterMinLastReferenceSeen1, pageAfterMinLastReferenceSeen2];

                const actualResults = await testSubject.getPagesNeverScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            }, 3000);

            it('returns results that does not have last run info', async () => {
                let queryResults: WebsitePage[];
                const pageWithLastRunNull = createPageWithLastRunInfo(website, null, afterLastReferenceSeenTime, 'lastRun is null');
                const pageWithLastRunNotFound = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'lastRun not found');
                const pageWithLastRunInfo = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'completed state after min rescan time',
                );

                await dbHelper.upsertItems([pageWithLastRunNull, pageWithLastRunNotFound, pageWithLastRunInfo]);
                queryResults = [pageWithLastRunNull, pageWithLastRunNotFound];

                const actualResults = await testSubject.getPagesNeverScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            }, 3000);

            it('returns top n query results', async () => {
                const basePage1 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 1', true);
                const basePage2 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 2', true);
                const childPage = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'child page', false);

                await dbHelper.upsertItems([basePage1, basePage2, childPage]);

                const actualResults = await testSubject.getPagesNeverScanned(website, 1);

                expect(actualResults.length).toBe(1);
            }, 3000);

            it('returns base page results only', async () => {
                let queryResults: WebsitePage[];
                const basePage1 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 1', true);
                const basePage2 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 2', true);
                const childPage = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'child page', false);

                await dbHelper.upsertItems([basePage1, basePage2, childPage]);
                queryResults = [basePage1, basePage2];

                const actualResults = await testSubject.getPagesNeverScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });
        });

        describe('getPagesNeverScanned for website with deep scanning', () => {
            it('returns top n query results for website with deep scanning true', async () => {
                setupDeepScanningWebsite(true);
                const basePage1 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 1', true);
                const basePage2 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 2', true);
                const childPage = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'child page', false);

                await dbHelper.upsertItems([basePage1, basePage2, childPage]);

                const actualResults = await testSubject.getPagesNeverScanned(website, 5);

                expect(actualResults.length).toBe(3);
            }, 3000);
            it('returns top n query results for website with deep scanning false', async () => {
                setupDeepScanningWebsite(false);
                const basePage1 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 1', true);
                const basePage2 = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'base page 2', true);
                const childPage = createPageWithoutLastRunInfo(website, afterLastReferenceSeenTime, 'child page', false);

                await dbHelper.upsertItems([basePage1, basePage2, childPage]);

                const actualResults = await testSubject.getPagesNeverScanned(website, 5);

                expect(actualResults.length).toBe(2);
            }, 3000);
        });

        describe('getPagesScanned', () => {
            it('do not return results without last run info', async () => {
                const pageAfterMinLastReferenceSeen = createPageWithoutLastRunInfo(
                    website,
                    afterLastReferenceSeenTime,
                    'after lastReferenceSeen date',
                );
                const pageBeforeMinLastReferenceSeen = createPageWithoutLastRunInfo(
                    website,
                    beforeLastReferenceSeenTime,
                    'before lastReferenceSeen date',
                );
                const pageWithLastRunNull = createPageWithLastRunInfo(website, null, afterLastReferenceSeenTime, 'lastRun is null');

                const pageWithLastRunInfo = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'completed state after min rescan time',
                );

                const queryResults: WebsitePage[] = [];
                queryResults.push(pageWithLastRunInfo);

                const nonQueryResults: WebsitePage[] = [];
                nonQueryResults.push(pageBeforeMinLastReferenceSeen);
                nonQueryResults.push(pageWithLastRunInfo);
                nonQueryResults.push(pageWithLastRunNull);
                nonQueryResults.push(pageAfterMinLastReferenceSeen);

                await dbHelper.upsertItems(queryResults);
                await dbHelper.upsertItems(nonQueryResults);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('returns results with last run info state as completed', async () => {
                const queryResults: WebsitePage[] = [];
                const nonQueryResults: WebsitePage[] = [];

                const pageWithLastRunCompletedAfterMaxRescanTime = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'completed state after min rescan time',
                );
                queryResults.push(pageWithLastRunCompletedAfterMaxRescanTime);

                const pageWithLastRunCompletedBeforeMaxRescanTime = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: beforeRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'completed state before min rescan time',
                );
                nonQueryResults.push(pageWithLastRunCompletedBeforeMaxRescanTime);

                await dbHelper.upsertItems(queryResults);
                await dbHelper.upsertItems(nonQueryResults);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('returns results sorted by last run time', async () => {
                const queryResults: WebsitePage[] = [];

                const page1 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page1',
                );
                const page2 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: unMockedMoment(afterRescanIntervalTime).add(1, 'hour'),
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page2',
                );

                const page3 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: unMockedMoment(afterRescanIntervalTime).subtract(1, 'hour'),
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page3',
                );

                queryResults.push(page1);
                queryResults.push(page2);
                queryResults.push(page3);

                await dbHelper.upsertItems(queryResults);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithOrder([page3, page1, page2], actualResults);
            });

            it('returns top n query result', async () => {
                const queryResults: WebsitePage[] = [];

                const page1 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page1',
                );
                const page2 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: unMockedMoment(afterRescanIntervalTime).add(1, 'hour'),
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page2',
                );

                const page3 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: unMockedMoment(afterRescanIntervalTime).subtract(1, 'hour'),
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page3',
                );

                queryResults.push(page1);
                queryResults.push(page2);
                queryResults.push(page3);

                await dbHelper.upsertItems(queryResults);

                const actualResults = await testSubject.getPagesScanned(website, 2);

                expect(actualResults.length).toBe(2);
            });

            it('returns base pages only', async () => {
                let queryResults: WebsitePage[];

                const basePage1 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'base page 1',
                    true,
                );
                const basePage2 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'base page 2',
                    true,
                );

                const childPage = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'child page',
                    false,
                );

                queryResults = [basePage1, basePage2];

                await dbHelper.upsertItems([basePage1, basePage2, childPage]);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('returns results with last run info state as failed/queued/running', async () => {
                const queryResults: WebsitePage[] = [];
                const nonQueryResults: WebsitePage[] = [];

                const pageWithFailedRunAfterMaxRescanAbandonTime = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.failed,
                    },
                    afterLastReferenceSeenTime,
                    'With Failed Run after Min RescanAbandonTime',
                );
                queryResults.push(pageWithFailedRunAfterMaxRescanAbandonTime);

                const pageWithFailedRunBeforeMaxRescanAbandonTime = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: beforeFailedPageRescanIntervalTime,
                        state: RunState.failed,
                    },
                    afterLastReferenceSeenTime,
                    'With Failed Run Before Min RescanAbandonTime',
                );
                nonQueryResults.push(pageWithFailedRunBeforeMaxRescanAbandonTime);

                const pageWithRunningStateAfterMaxRescanAbandonTime = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.running,
                    },
                    afterLastReferenceSeenTime,
                    'With Running state After Min RescanAbandonTime',
                );
                queryResults.push(pageWithRunningStateAfterMaxRescanAbandonTime);

                const pageWithQueuedStateRunAfterMaxRescanAbandonTime = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.queued,
                    },
                    afterLastReferenceSeenTime,
                    'With Queued State After Min RescanAbandonTime',
                );
                queryResults.push(pageWithQueuedStateRunAfterMaxRescanAbandonTime);

                await dbHelper.upsertItems(queryResults);
                await dbHelper.upsertItems(nonQueryResults);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('returns results within max retry value', async () => {
                const queryResults: WebsitePage[] = [];
                const nonQueryResults: WebsitePage[] = [];

                const pageWithMaxRetires = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: beforeRescanIntervalTime,
                        state: RunState.failed,
                        retries: scanConfig.maxScanRetryCount,
                    },
                    afterLastReferenceSeenTime,
                    'page with max retries',
                );
                nonQueryResults.push(pageWithMaxRetires);

                const pageWithMaxRetryNotReached = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.failed,
                        retries: scanConfig.maxScanRetryCount - 1,
                    },
                    afterLastReferenceSeenTime,
                    'page with max retry not reached',
                );

                queryResults.push(pageWithMaxRetryNotReached);

                await dbHelper.upsertItems(queryResults);
                await dbHelper.upsertItems(nonQueryResults);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('filter out unscannable pages', async () => {
                const queryResults: WebsitePage[] = [];
                const nonQueryResults: WebsitePage[] = [];

                const unscannablePage = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: beforeRescanIntervalTime,
                        state: RunState.failed,
                        unscannable: true,
                    },
                    afterLastReferenceSeenTime,
                    'unscannable page',
                );
                nonQueryResults.push(unscannablePage);

                const scannablePage1 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.failed,
                        unscannable: undefined,
                    },
                    afterLastReferenceSeenTime,
                    'scannable page',
                );

                const scannablePage2 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.failed,
                        unscannable: false,
                    },
                    afterLastReferenceSeenTime,
                    'scannable page',
                );

                queryResults.push(scannablePage1);
                queryResults.push(scannablePage2);

                await dbHelper.upsertItems(queryResults);
                await dbHelper.upsertItems(nonQueryResults);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });
        });
        describe('getPagesScanned for website with deep scanning', () => {
            it('returns top n query result for website with deep scanning true', async () => {
                setupDeepScanningWebsite(true);
                let queryResults: WebsitePage[];

                const basePage1 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'base page 1',
                    true,
                );
                const basePage2 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'base page 2',
                    true,
                );

                const childPage = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'child page',
                    false,
                );

                queryResults = [basePage1, basePage2, childPage];

                await dbHelper.upsertItems([basePage1, basePage2, childPage]);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });
            it('returns top n query result for website with deep scanning false', async () => {
                setupDeepScanningWebsite(false);
                let queryResults: WebsitePage[];

                const basePage1 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'base page 1',
                    true,
                );
                const basePage2 = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'base page 2',
                    true,
                );

                const childPage = createPageWithLastRunInfo(
                    website,
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'child page',
                    false,
                );

                queryResults = [basePage1, basePage2];

                await dbHelper.upsertItems([basePage1, basePage2, childPage]);

                const actualResults = await testSubject.getPagesScanned(website, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });
        });
        describe('getWebsites', () => {
            it('returns websites', async () => {
                const websiteId1 = dbHelper.createRandomString('websiteId');
                const websiteId2 = dbHelper.createRandomString('websiteId');
                const websiteId3 = dbHelper.createRandomString('websiteId');
                const website1 = dbHelper.createWebsiteDocument({ websiteId: websiteId1 });
                const website2 = dbHelper.createWebsiteDocument({ websiteId: websiteId2 });
                const website3 = dbHelper.createWebsiteDocument({ websiteId: websiteId3 });
                const allWebsites = [website1, website2, website3];
                const actualWebsiteIds = [] as string[];
                await dbHelper.upsertItems(Array.from(allWebsites));

                const actualQueryResults = await testSubject.getWebsites();
                actualQueryResults.item.forEach(w => {
                    actualWebsiteIds.push(w.websiteId);
                });

                expect(new Set(actualWebsiteIds)).toEqual(new Set([websiteId1, websiteId2, websiteId3]));
            });
        });
    }
});
