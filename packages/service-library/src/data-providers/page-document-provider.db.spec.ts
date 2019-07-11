// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-unsafe-any no-null-keyword no-object-literal-type-assertion
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
import { Logger } from 'logger';
import * as moment from 'moment';
import { RunState, WebsitePage } from 'storage-documents';
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
        let testSubject: PageDocumentProvider;
        let websiteId: string;
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
            websiteId = dbHelper.createRandomString('websiteId');
            loggerMock = Mock.ofType<Logger>();
            const storageClient = new StorageClient(
                dbHelper.cosmosClient,
                dbHelper.dbContainer.dbName,
                dbHelper.dbContainer.collectionName,
                loggerMock.object,
            );

            beforeLastReferenceSeenTime = currentMoment()
                .subtract(PageDocumentProvider.minLastReferenceSeenInDays + 1, 'day')
                .toJSON();

            afterLastReferenceSeenTime = currentMoment()
                .subtract(PageDocumentProvider.minLastReferenceSeenInDays - 1, 'day')
                .toJSON();

            afterRescanIntervalTime = currentMoment()
                .subtract(PageDocumentProvider.pageRescanIntervalInDays + 1, 'day')
                .toJSON();

            beforeRescanIntervalTime = currentMoment()
                .subtract(PageDocumentProvider.pageRescanIntervalInDays - 1, 'hour')
                .toJSON();

            afterFailedPageRescanIntervalTime = currentMoment()
                .subtract(PageDocumentProvider.failedPageRescanIntervalInHours + 1, 'hour')
                .toJSON();
            beforeFailedPageRescanIntervalTime = currentMoment()
                .subtract(PageDocumentProvider.failedPageRescanIntervalInHours - 1, 'hour')
                .toJSON();

            testSubject = new PageDocumentProvider(storageClient);
        });

        function createPageWithLastRunInfo(lastRun: any, lastReferenceSeen: string, label: string): WebsitePage {
            const page = createPageWithoutLastRunInfo(lastReferenceSeen, label);
            page.lastRun = lastRun;

            return page;
        }

        function createPageWithoutLastRunInfo(lastReferenceSeen: string, label: string): WebsitePage {
            return dbHelper.createPageDocument({
                label: label,
                websiteId: websiteId,
                extra: {
                    lastReferenceSeen: lastReferenceSeen,
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

        describe('getPagesNeverScanned', () => {
            let pageAfterMinLastReferenceSeen: WebsitePage;
            let pageBeforeMinLastReferenceSeen: WebsitePage;
            let pageWithLastRunNull: WebsitePage;

            let pageWithLastRunInfo: WebsitePage;

            beforeEach(async () => {
                const allPages = [];

                pageAfterMinLastReferenceSeen = createPageWithoutLastRunInfo(afterLastReferenceSeenTime, 'after lastReferenceSeen date');
                allPages.push(pageAfterMinLastReferenceSeen);

                pageBeforeMinLastReferenceSeen = createPageWithoutLastRunInfo(beforeLastReferenceSeenTime, 'before lastReferenceSeen date');
                allPages.push(pageBeforeMinLastReferenceSeen);

                pageWithLastRunNull = createPageWithLastRunInfo(null, afterLastReferenceSeenTime, 'lastRun is null');
                allPages.push(pageWithLastRunNull);

                pageWithLastRunInfo = createPageWithLastRunInfo(
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'completed state after min rescan time',
                );
                allPages.push(pageWithLastRunInfo);

                await dbHelper.upsertItems(allPages);
            });

            it('returns all query results', async () => {
                const actualResults = await testSubject.getPagesNeverScanned(websiteId, 10);

                const expectedResults = [pageAfterMinLastReferenceSeen, pageWithLastRunNull];

                verifyQueryResultsWithoutOrder(expectedResults, actualResults);
            }, 3000);

            it('returns top n query results', async () => {
                const actualResults = await testSubject.getPagesNeverScanned(websiteId, 1);

                expect(actualResults.length).toBe(1);
            }, 3000);
        });

        describe('getPagesScanned', () => {
            it('do not return results without last run info', async () => {
                const pageAfterMinLastReferenceSeen = createPageWithoutLastRunInfo(
                    afterLastReferenceSeenTime,
                    'after lastReferenceSeen date',
                );
                const pageBeforeMinLastReferenceSeen = createPageWithoutLastRunInfo(
                    beforeLastReferenceSeenTime,
                    'before lastReferenceSeen date',
                );
                const pageWithLastRunNull = createPageWithLastRunInfo(null, afterLastReferenceSeenTime, 'lastRun is null');

                const pageWithLastRunInfo = createPageWithLastRunInfo(
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

                const actualResults = await testSubject.getPagesScanned(websiteId, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('returns results with last run info state as completed', async () => {
                const queryResults: WebsitePage[] = [];
                const nonQueryResults: WebsitePage[] = [];

                const pageWithLastRunCompletedAfterMaxRescanTime = createPageWithLastRunInfo(
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'completed state after min rescan time',
                );
                queryResults.push(pageWithLastRunCompletedAfterMaxRescanTime);

                const pageWithLastRunCompletedBeforeMaxRescanTime = createPageWithLastRunInfo(
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

                const actualResults = await testSubject.getPagesScanned(websiteId, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('returns results sorted by last run time', async () => {
                const queryResults: WebsitePage[] = [];

                const page1 = createPageWithLastRunInfo(
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page1',
                );
                const page2 = createPageWithLastRunInfo(
                    {
                        runTime: unMockedMoment(afterRescanIntervalTime).add(1, 'hour'),
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page2',
                );

                const page3 = createPageWithLastRunInfo(
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

                const actualResults = await testSubject.getPagesScanned(websiteId, 10);

                verifyQueryResultsWithOrder([page3, page1, page2], actualResults);
            });

            it('returns top n query result', async () => {
                const queryResults: WebsitePage[] = [];

                const page1 = createPageWithLastRunInfo(
                    {
                        runTime: afterRescanIntervalTime,
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page1',
                );
                const page2 = createPageWithLastRunInfo(
                    {
                        runTime: unMockedMoment(afterRescanIntervalTime).add(1, 'hour'),
                        state: RunState.completed,
                    },
                    afterLastReferenceSeenTime,
                    'page2',
                );

                const page3 = createPageWithLastRunInfo(
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

                const actualResults = await testSubject.getPagesScanned(websiteId, 2);

                expect(actualResults.length).toBe(2);
            });

            it('returns results with last run info state as failed/queued/running', async () => {
                const queryResults: WebsitePage[] = [];
                const nonQueryResults: WebsitePage[] = [];

                const pageWithFailedRunAfterMaxRescanAbandonTime = createPageWithLastRunInfo(
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.failed,
                    },
                    afterLastReferenceSeenTime,
                    'With Failed Run after Min RescanAbandonTime',
                );
                queryResults.push(pageWithFailedRunAfterMaxRescanAbandonTime);

                const pageWithFailedRunBeforeMaxRescanAbandonTime = createPageWithLastRunInfo(
                    {
                        runTime: beforeFailedPageRescanIntervalTime,
                        state: RunState.failed,
                    },
                    afterLastReferenceSeenTime,
                    'With Failed Run Before Min RescanAbandonTime',
                );
                nonQueryResults.push(pageWithFailedRunBeforeMaxRescanAbandonTime);

                const pageWithRunningStateAfterMaxRescanAbandonTime = createPageWithLastRunInfo(
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.running,
                    },
                    afterLastReferenceSeenTime,
                    'With Running state After Min RescanAbandonTime',
                );
                queryResults.push(pageWithRunningStateAfterMaxRescanAbandonTime);

                const pageWithQueuedStateRunAfterMaxRescanAbandonTime = createPageWithLastRunInfo(
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

                const actualResults = await testSubject.getPagesScanned(websiteId, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });

            it('returns results within max retry value', async () => {
                const queryResults: WebsitePage[] = [];
                const nonQueryResults: WebsitePage[] = [];

                const pageWithMaxRetires = createPageWithLastRunInfo(
                    {
                        runTime: beforeRescanIntervalTime,
                        state: RunState.failed,
                        retries: PageDocumentProvider.maxScanRetryCount,
                    },
                    afterLastReferenceSeenTime,
                    'page with max retries',
                );
                nonQueryResults.push(pageWithMaxRetires);

                const pageWithMaxRetryNotReached = createPageWithLastRunInfo(
                    {
                        runTime: afterFailedPageRescanIntervalTime,
                        state: RunState.failed,
                        retries: PageDocumentProvider.maxScanRetryCount - 1,
                    },
                    afterLastReferenceSeenTime,
                    'page with max retry not reached',
                );

                queryResults.push(pageWithMaxRetryNotReached);

                await dbHelper.upsertItems(queryResults);
                await dbHelper.upsertItems(nonQueryResults);

                const actualResults = await testSubject.getPagesScanned(websiteId, 10);

                verifyQueryResultsWithoutOrder(queryResults, actualResults);
            });
        });

        describe('getWebsiteIds', () => {
            it('returns website ids', async () => {
                const website1 = dbHelper.createWebsiteDocument({ websiteId: 'site1' });
                const website2 = dbHelper.createWebsiteDocument({ websiteId: 'site1' });
                const website3 = dbHelper.createWebsiteDocument({ websiteId: 'site1' });
                const allWebsites = [website1, website2, website3];

                await dbHelper.upsertItems(Array.from(allWebsites));

                const actualQueryResults = await testSubject.getWebsiteIds();

                expect(new Set(actualQueryResults.item)).toEqual(new Set(allWebsites.map(s => s.websiteId)));
            });
        });
    }
});
