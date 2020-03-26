// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-import-side-effect no-any no-unsafe-any max-func-body-length no-null-keyword no-object-literal-type-assertion
import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import * as moment from 'moment';
import { ItemType, RunState, Website, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';

import { ScanRunTimeConfig, ServiceConfiguration } from 'common';
import { PageDocumentProvider } from './page-document-provider';

// tslint:disable: mocha-no-side-effect-code
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
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let pageDocumentProvider: PageDocumentProvider;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let scanConfig: ScanRunTimeConfig;

    beforeEach(() => {
        scanConfig = {
            failedPageRescanIntervalInHours: 3,
            maxScanRetryCount: 4,
            maxSendNotificationRetryCount: 5,
            minLastReferenceSeenInDays: 5,
            pageRescanIntervalInDays: 6,
            accessibilityRuleExclusionList: [],
            scanTimeoutInMin: 1,
        };

        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock.setup(async s => s.getConfigValue('scanConfig')).returns(async () => scanConfig);
        pageDocumentProvider = new PageDocumentProvider(serviceConfigMock.object, cosmosContainerClientMock.object);
    });

    describe('getWebsites', () => {
        const query = getWebSiteIdsQuery('website');
        const token = 'continuationToken';

        it('returns website ids when success', async () => {
            const response: any = { item: ['web site id'], statusCode: 200 };

            cosmosContainerClientMock
                .setup(s =>
                    s.queryDocuments(
                        It.is((q: string) => compareQuery(q, query)),
                        token,
                    ),
                )
                .returns(() => Promise.resolve(response));
            await expect(pageDocumentProvider.getWebsites(token)).resolves.toBe(response);
        });

        it('throws on response with invalid status code', async () => {
            const response: any = { item: ['web site id'], statusCode: 401 };

            cosmosContainerClientMock
                .setup(s =>
                    s.queryDocuments(
                        It.is((q: string) => compareQuery(q, query)),
                        token,
                    ),
                )
                .returns(() => Promise.resolve(response));
            await expect(pageDocumentProvider.getWebsites(token)).rejects.not.toBeNull();
        });
    });

    describe('getPagesNeverScanned', () => {
        const itemCount = 5;

        test.each([createWebsiteDocument('website1'), createWebsiteDocument('website1', true), createWebsiteDocument('website1', false)])(
            'returns pages across multiple calls',
            async (website: Website) => {
                const query = getPagesNeverScannedQuery(website, itemCount);
                let executeWithTokenCallback: (token: string) => Promise<any> = null;
                const expectedResponse: any = 'expected response';
                const queryResponse: CosmosOperationResponse<any> = { item: ['pageId3'], statusCode: 200 };

                cosmosContainerClientMock
                    .setup(s =>
                        s.queryDocuments(
                            It.is((q: string) => compareQuery(q, query)),
                            'token1',
                        ),
                    )
                    .returns(() => Promise.resolve(queryResponse));

                cosmosContainerClientMock
                    .setup(s => s.executeQueryWithContinuationToken(It.isAny()))
                    .callback(func => {
                        executeWithTokenCallback = func;
                    })
                    .returns(() => Promise.resolve(expectedResponse))
                    .verifiable();

                await expect(pageDocumentProvider.getPagesNeverScanned(website, itemCount)).resolves.toBe(expectedResponse);
                await expect(executeWithTokenCallback('token1')).resolves.toBe(queryResponse);

                cosmosContainerClientMock.verifyAll();
            },
        );
    });

    describe('getPagesScanned', () => {
        const itemCount = 5;

        test.each([createWebsiteDocument('website1'), createWebsiteDocument('website1', true), createWebsiteDocument('website1', false)])(
            'returns pages across multiple calls',
            async (website: Website) => {
                const query = getPagesScannedQuery(website, itemCount);
                let executeWithTokenCallback: (token: string) => Promise<any> = null;
                const expectedResponse: any = 'expected response';
                const queryResponse: CosmosOperationResponse<any> = { item: ['pageId3'], statusCode: 200 };

                cosmosContainerClientMock
                    .setup(s =>
                        s.queryDocuments(
                            It.is((q: string) => compareQuery(q, query)),
                            'token1',
                        ),
                    )
                    .returns(() => Promise.resolve(queryResponse));

                cosmosContainerClientMock
                    .setup(s => s.executeQueryWithContinuationToken(It.isAny()))
                    .callback(func => {
                        executeWithTokenCallback = func;
                    })
                    .returns(() => Promise.resolve(expectedResponse))
                    .verifiable();

                await expect(pageDocumentProvider.getPagesScanned(website, itemCount)).resolves.toBe(expectedResponse);
                await expect(executeWithTokenCallback('token1')).resolves.toBe(queryResponse);

                cosmosContainerClientMock.verifyAll();
            },
        );
    });

    describe('getReadyToScanPagesForWebsite', () => {
        const website = createWebsiteDocument('website1');
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

            getPagesNotScannedBeforeMock.setup(g => g(website, itemCount)).returns(() => Promise.resolve(webPagesNotScannedBefore));

            const result = await pageDocumentProvider.getReadyToScanPagesForWebsite(website, itemCount);

            expect(result).toEqual(webPagesNotScannedBefore);
        });

        it('returns only pages that were scanned at least once', async () => {
            webPagesNotScannedBefore = [];
            webPagesScannedAtLeastOnce = createWebsitePages(itemCount, 'scanned-page-id');

            getPagesNotScannedBeforeMock.setup(g => g(website, itemCount)).returns(() => Promise.resolve(webPagesNotScannedBefore));
            getPagesScannedAtLeastOnceMock.setup(g => g(website, itemCount)).returns(() => Promise.resolve(webPagesScannedAtLeastOnce));

            const result = await pageDocumentProvider.getReadyToScanPagesForWebsite(website, itemCount);

            expect(result).toEqual(webPagesScannedAtLeastOnce);
        });

        it('returns un-scanned & pages that were scanned at least once', async () => {
            const webPagesNotScannedCount = 3;
            webPagesNotScannedBefore = createWebsitePages(webPagesNotScannedCount, 'un-scanned-page-id');
            webPagesScannedAtLeastOnce = createWebsitePages(itemCount - webPagesNotScannedCount, 'scanned-page-id');

            getPagesNotScannedBeforeMock.setup(g => g(website, itemCount)).returns(() => Promise.resolve(webPagesNotScannedBefore));
            getPagesScannedAtLeastOnceMock
                .setup(g => g(website, itemCount - webPagesNotScannedCount))
                .returns(() => Promise.resolve(webPagesScannedAtLeastOnce));

            const result = await pageDocumentProvider.getReadyToScanPagesForWebsite(website, itemCount);

            expect(result).toEqual(webPagesNotScannedBefore.concat(webPagesScannedAtLeastOnce));
        });
    });

    describe('getReadyToScanPages', () => {
        let getWebsitesMock: IMock<typeof pageDocumentProvider.getWebsites>;
        let getReadyToScanPagesForWebsiteMock: IMock<typeof pageDocumentProvider.getReadyToScanPagesForWebsite>;
        const continuationToken = 'continuation-token1';
        let websitesResponse: CosmosOperationResponse<Website[]>;
        const pageBatchSize = 2;
        let allPages: WebsitePage[];

        beforeEach(() => {
            getWebsitesMock = Mock.ofInstance(pageDocumentProvider.getWebsites, MockBehavior.Strict);
            getReadyToScanPagesForWebsiteMock = Mock.ofInstance(pageDocumentProvider.getReadyToScanPagesForWebsite, MockBehavior.Strict);

            pageDocumentProvider.getWebsites = getWebsitesMock.object;
            pageDocumentProvider.getReadyToScanPagesForWebsite = getReadyToScanPagesForWebsiteMock.object;
            websitesResponse = createSuccessCosmosResponse(
                [createWebsiteDocument('website1'), createWebsiteDocument('website2')],
                continuationToken,
            );
            getWebsitesMock.setup(s => s(continuationToken)).returns(() => Promise.resolve(websitesResponse));

            allPages = [];
            websitesResponse.item.forEach(item => {
                const pagesForWebsite = createWebsitePages(pageBatchSize, item.websiteId);
                allPages.push(...pagesForWebsite);

                getReadyToScanPagesForWebsiteMock.setup(g => g(item, pageBatchSize)).returns(() => Promise.resolve(pagesForWebsite));
            });
        });

        afterEach(() => {
            getWebsitesMock.verifyAll();
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

        cosmosContainerClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePageToWrite))
            .returns(async () => Promise.resolve({ item: websitePageToWrite, statusCode: 200 }))
            .verifiable(Times.once());

        const result = await pageDocumentProvider.updatePageProperties(websitePageBase, propertiesToUpdate);

        expect(result.item).toEqual(websitePageToWrite);
    });

    function compareQuery(q1: string, q2: string): boolean {
        return q1.replace(/\s+/g, ' ') === q2.replace(/\s+/g, ' ');
    }
    function getWebSiteIdsQuery(pk: string): string {
        return `SELECT * FROM c WHERE c.partitionKey = "${pk}" and c.itemType = '${ItemType.website}' ORDER BY c.websiteId`;
    }
    function getPageScanningCondition(website: Website): string {
        return website.deepScanningEnabled ? '1=1' : 'c.basePage = true';
    }
    function getMinLastReferenceSeenValue(): string {
        return moment()
            .subtract(scanConfig.minLastReferenceSeenInDays, 'day')
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
    function createWebsiteDocument(websiteId: string, deepScanningEnabled?: boolean): Website {
        const website = {
            id: 'A1234',
            itemType: ItemType.website,
            partitionKey: 'website',
            websiteId: websiteId,
            name: 'Test',
            baseUrl: 'https://wwww.baseurl.com',
            serviceTreeId: 'awe1234',
        };

        if (deepScanningEnabled !== undefined) {
            (<any>website).deepScanningEnabled = deepScanningEnabled;
        }

        return website;
    }
    function getPagesNeverScannedQuery(website: Website, itemCount: number): string {
        return `SELECT TOP ${itemCount} * FROM c WHERE
        c.partitionKey = "${website.websiteId}" and c.itemType = 'page' and c.websiteId = '${
            website.websiteId
        }' and c.lastReferenceSeen >= '${getMinLastReferenceSeenValue()}'
        and ${getPageScanningCondition(website)}
        and (IS_NULL(c.lastRun) or NOT IS_DEFINED(c.lastRun))`;
    }
    function getPagesScannedQuery(website: Website, itemCount: number): string {
        const maxRescanAfterFailureTime = moment()
            .subtract(scanConfig.failedPageRescanIntervalInHours, 'hour')
            .toJSON();
        const maxRescanTime = moment()
            .subtract(scanConfig.pageRescanIntervalInDays, 'day')
            .toJSON();

        return `SELECT TOP ${itemCount} * FROM c WHERE
        c.partitionKey = "${website.websiteId}" and c.itemType = '${ItemType.page}' and c.websiteId = '${
            website.websiteId
        }' and c.lastReferenceSeen >= '${getMinLastReferenceSeenValue()}' and ${getPageScanningCondition(website)}
            and (
            ((c.lastRun.state = '${RunState.failed}' or c.lastRun.state = '${RunState.queued}' or c.lastRun.state = '${RunState.running}')
                and (c.lastRun.retries < ${scanConfig.maxScanRetryCount} or IS_NULL(c.lastRun.retries) or NOT IS_DEFINED(c.lastRun.retries))
                and c.lastRun.runTime <= '${maxRescanAfterFailureTime}'
                and (IS_NULL(c.lastRun.unscannable) or NOT IS_DEFINED(c.lastRun.unscannable) or c.lastRun.unscannable <> true))
            or (c.lastRun.state = '${RunState.completed}' and c.lastRun.runTime <= '${maxRescanTime}')
            ) order by c.lastRun.runTime asc`;
    }
});
