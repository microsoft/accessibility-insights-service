// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any max-func-body-length no-null-keyword no-object-literal-type-assertion

import 'reflect-metadata';

import { CosmosOperationResponse, StorageClient } from 'azure-services';
import * as moment from 'moment';
import { ItemType, RunState, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
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

describe('PageDocumentProvider', () => {
    let storageClientMock: IMock<StorageClient>;
    let pageDocumentProvider: PageDocumentProvider;

    beforeEach(() => {
        storageClientMock = Mock.ofType<StorageClient>();
        pageDocumentProvider = new PageDocumentProvider(storageClientMock.object);
    });

    describe('getWebsiteIds', () => {
        // tslint:disable-next-line: mocha-no-side-effect-code
        const query = getWebSiteIdsQuery();
        const token = 'continuationToken';

        it('returns website ids when success', async () => {
            const response: any = { item: ['web site id'], statusCode: 200 };

            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), token, 'website'))
                .returns(() => Promise.resolve(response));
            await expect(pageDocumentProvider.getWebsiteIds(token)).resolves.toBe(response);
        });

        it('throws on response with invalid status code', async () => {
            const response: any = { item: ['web site id'], statusCode: 401 };

            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), token, 'website'))
                .returns(() => Promise.resolve(response));
            await expect(pageDocumentProvider.getWebsiteIds(token)).rejects.not.toBeNull();
        });
    });

    describe('getPagesNeverScanned', () => {
        const websiteId = 'website1';
        let query: string;
        const itemCount = 5;

        beforeEach(() => {
            query = `SELECT TOP ${itemCount} * FROM c WHERE
            c.itemType = 'page' and c.websiteId = '${websiteId}' and c.lastReferenceSeen >= '${getMinLastReferenceSeenValue()}'
            and (IS_NULL(c.lastRun) or NOT IS_DEFINED(c.lastRun))`;
        });

        it('returns pages across multiple calls', async () => {
            const pageResultsFor1stCall = ['pageId1', 'pageId2'];
            const pageResultsFor2ndCall = ['pageId3', 'pageId4'];

            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), undefined, websiteId))
                .returns(() => Promise.resolve({ item: pageResultsFor1stCall.slice(0), statusCode: 200, continuationToken: 'token1' }));
            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), 'token1', websiteId))
                .returns(() => Promise.resolve({ item: pageResultsFor2ndCall.slice(0), statusCode: 200 }));

            const results = await pageDocumentProvider.getPagesNeverScanned(websiteId, itemCount);

            expect(results).toEqual(pageResultsFor1stCall.concat(pageResultsFor2ndCall));
        });

        it('throws on response with invalid status code', async () => {
            const pageResultsFor1stCall = ['pageId1', 'pageId2'];

            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), undefined, websiteId))
                .returns(() => Promise.resolve({ item: pageResultsFor1stCall, statusCode: 401, continuationToken: 'token1' }));

            await expect(pageDocumentProvider.getPagesNeverScanned(websiteId, itemCount)).rejects.not.toBeNull();
        });
    });

    describe('getPagesScanned', () => {
        const websiteId = 'website1';
        let query: string;
        const itemCount = 5;

        beforeEach(() => {
            const maxRescanAfterFailureTime = moment()
                .subtract(PageDocumentProvider.failedPageRescanIntervalInHours, 'hour')
                .toJSON();
            const maxRescanTime = moment()
                .subtract(PageDocumentProvider.pageRescanIntervalInDays, 'day')
                .toJSON();

            query = `SELECT TOP ${itemCount} * FROM c WHERE
            c.itemType = '${ItemType.page}' and c.websiteId = '${websiteId}' and c.lastReferenceSeen >= '${getMinLastReferenceSeenValue()}'
            and (
            ((c.lastRun.state = '${RunState.failed}' or c.lastRun.state = '${RunState.queued}' or c.lastRun.state = '${RunState.running}')
                and (c.lastRun.retries < ${
                    PageDocumentProvider.maxScanRetryCount
                } or IS_NULL(c.lastRun.retries) or NOT IS_DEFINED(c.lastRun.retries))
                and c.lastRun.runTime <= '${maxRescanAfterFailureTime}')
            or (c.lastRun.state = '${RunState.completed}' and c.lastRun.runTime <= '${maxRescanTime}')
            ) order by c.lastRun.runTime asc`;
        });

        it('returns pages across multiple calls', async () => {
            const pageResultsFor1stCall = ['pageId1', 'pageId2'];
            const pageResultsFor2ndCall = ['pageId3', 'pageId4'];

            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), undefined, websiteId))
                .returns(() => Promise.resolve({ item: pageResultsFor1stCall.slice(0), statusCode: 200, continuationToken: 'token1' }));
            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), 'token1', websiteId))
                .returns(() => Promise.resolve({ item: pageResultsFor2ndCall.slice(0), statusCode: 200 }));

            const results = await pageDocumentProvider.getPagesScanned(websiteId, itemCount);

            expect(results).toEqual(pageResultsFor1stCall.concat(pageResultsFor2ndCall));
        });

        it('throws on response with invalid status code', async () => {
            const pageResultsFor1stCall = ['pageId1', 'pageId2'];

            storageClientMock
                .setup(s => s.queryDocuments(It.is((q: string) => compareQuery(q, query)), undefined, websiteId))
                .returns(() => Promise.resolve({ item: pageResultsFor1stCall, statusCode: 401, continuationToken: 'token1' }));

            await expect(pageDocumentProvider.getPagesNeverScanned(websiteId, itemCount)).rejects.not.toBeNull();
        });
    });

    describe('getReadyToScanPagesForWebsite', () => {
        const websiteId = 'website1';
        let getPagesNotScannedBeforeMock: IMock<typeof pageDocumentProvider.getPagesNeverScanned>;
        let getPagesScannedAtLeastOnceMock: IMock<typeof pageDocumentProvider.getPagesScanned>;
        let webPagesNotScannedBefore: WebsitePage[];
        let webPagesScannedAtLeastOnce: WebsitePage[];
        const itemCount = 5;

        beforeEach(() => {
            getPagesNotScannedBeforeMock = Mock.ofInstance(pageDocumentProvider.getPagesNeverScanned, MockBehavior.Strict);
            getPagesScannedAtLeastOnceMock = Mock.ofInstance(pageDocumentProvider.getPagesScanned, MockBehavior.Strict);

            pageDocumentProvider.getPagesNeverScanned = getPagesNotScannedBeforeMock.object;
            pageDocumentProvider.getPagesScanned = getPagesScannedAtLeastOnceMock.object;
        });

        afterEach(() => {
            getPagesNotScannedBeforeMock.verifyAll();
            getPagesScannedAtLeastOnceMock.verifyAll();
        });

        it('returns only pages not scanned before', async () => {
            webPagesNotScannedBefore = createWebsitePages(itemCount, 'un-scanned-page-id');

            getPagesNotScannedBeforeMock.setup(g => g(websiteId, itemCount)).returns(() => Promise.resolve(webPagesNotScannedBefore));

            const result = await pageDocumentProvider.getReadyToScanPagesForWebsite(websiteId, itemCount);

            expect(result).toEqual(webPagesNotScannedBefore);
        });

        it('returns only pages that were scanned at least once', async () => {
            webPagesNotScannedBefore = [];
            webPagesScannedAtLeastOnce = createWebsitePages(itemCount, 'scanned-page-id');

            getPagesNotScannedBeforeMock.setup(g => g(websiteId, itemCount)).returns(() => Promise.resolve(webPagesNotScannedBefore));
            getPagesScannedAtLeastOnceMock.setup(g => g(websiteId, itemCount)).returns(() => Promise.resolve(webPagesScannedAtLeastOnce));

            const result = await pageDocumentProvider.getReadyToScanPagesForWebsite(websiteId, itemCount);

            expect(result).toEqual(webPagesScannedAtLeastOnce);
        });

        it('returns un-scanned & pages that were scanned at least once', async () => {
            const webPagesNotScannedCount = 3;
            webPagesNotScannedBefore = createWebsitePages(webPagesNotScannedCount, 'un-scanned-page-id');
            webPagesScannedAtLeastOnce = createWebsitePages(itemCount - webPagesNotScannedCount, 'scanned-page-id');

            getPagesNotScannedBeforeMock.setup(g => g(websiteId, itemCount)).returns(() => Promise.resolve(webPagesNotScannedBefore));
            getPagesScannedAtLeastOnceMock
                .setup(g => g(websiteId, itemCount - webPagesNotScannedCount))
                .returns(() => Promise.resolve(webPagesScannedAtLeastOnce));

            const result = await pageDocumentProvider.getReadyToScanPagesForWebsite(websiteId, itemCount);

            expect(result).toEqual(webPagesNotScannedBefore.concat(webPagesScannedAtLeastOnce));
        });
    });

    describe('getReadyToScanPages', () => {
        let getWebsiteIdsMock: IMock<typeof pageDocumentProvider.getWebsiteIds>;
        let getReadyToScanPagesForWebsiteMock: IMock<typeof pageDocumentProvider.getReadyToScanPagesForWebsite>;
        const continuationToken = 'continuation-token1';
        let websiteIdsResponse: CosmosOperationResponse<string[]>;
        const pageBatchSize = 2;
        let allPages: WebsitePage[];

        beforeEach(() => {
            getWebsiteIdsMock = Mock.ofInstance(pageDocumentProvider.getWebsiteIds, MockBehavior.Strict);
            getReadyToScanPagesForWebsiteMock = Mock.ofInstance(pageDocumentProvider.getReadyToScanPagesForWebsite, MockBehavior.Strict);

            pageDocumentProvider.getWebsiteIds = getWebsiteIdsMock.object;
            pageDocumentProvider.getReadyToScanPagesForWebsite = getReadyToScanPagesForWebsiteMock.object;
            websiteIdsResponse = createSuccessCosmosResponse(['websiteId1', 'websiteId2'], continuationToken);
            getWebsiteIdsMock.setup(s => s(continuationToken)).returns(() => Promise.resolve(websiteIdsResponse));

            allPages = [];
            websiteIdsResponse.item.forEach(item => {
                const pagesForWebsite = createWebsitePages(pageBatchSize, item);
                allPages.push(...pagesForWebsite);

                getReadyToScanPagesForWebsiteMock.setup(g => g(item, pageBatchSize)).returns(() => Promise.resolve(pagesForWebsite));
            });
        });

        afterEach(() => {
            getWebsiteIdsMock.verifyAll();
            getReadyToScanPagesForWebsiteMock.verifyAll();
        });

        it('returns pages with website response token', async () => {
            const result = await pageDocumentProvider.getReadyToScanPages(continuationToken, pageBatchSize);

            expect(result.item).toEqual(allPages);
            expect(result.continuationToken).toBe(continuationToken);
            expect(result.statusCode).toBe(200);
        });
    });

    it('update page properties', async () => {
        const websitePageBase: WebsitePage = {
            id: 'id',
            itemType: ItemType.page,
            websiteId: 'websiteId',
            baseUrl: 'baseUrl',
            url: 'url',
            partitionKey: 'partitionKey',
            links: ['link1', 'link2'],
        };

        const propertiesToUpdate: WebsitePageExtra = {
            lastRun: {
                runTime: 'runTime',
                state: RunState.completed,
            },
        };

        const websitePageToWrite: WebsitePage = {
            id: 'id',
            itemType: ItemType.page,
            websiteId: 'websiteId',
            baseUrl: 'baseUrl',
            url: 'url',
            partitionKey: 'partitionKey',
            lastRun: {
                runTime: 'runTime',
                state: RunState.completed,
            },
        };

        storageClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePageToWrite))
            .returns(async () => Promise.resolve({ item: websitePageToWrite, statusCode: 200 }))
            .verifiable(Times.once());

        const result = await pageDocumentProvider.updatePageProperties(websitePageBase, propertiesToUpdate);

        expect(result.item).toEqual(websitePageToWrite);
    });

    function compareQuery(q1: string, q2: string): boolean {
        return q1.replace(/\s+/g, ' ') === q2.replace(/\s+/g, ' ');
    }
    function getWebSiteIdsQuery(): string {
        return `SELECT VALUE c.websiteId FROM c WHERE c.itemType = '${ItemType.website}' ORDER BY c.websiteId`;
    }

    function getMinLastReferenceSeenValue(): string {
        return moment()
            .subtract(PageDocumentProvider.minLastReferenceSeenInDays, 'day')
            .toJSON();
    }

    function createWebsitePages(itemCount: number, idPrefix: string = 'id'): WebsitePage[] {
        const items: WebsitePage[] = [];
        for (let i = 0; i < itemCount; i = i + 1) {
            items.push({ id: `${idPrefix}-${i}` } as WebsitePage);
        }

        return items;
    }

    function createSuccessCosmosResponse(result: any, token?: string): CosmosOperationResponse<any> {
        return {
            continuationToken: token,
            item: result,
            statusCode: 200,
        };
    }
});
