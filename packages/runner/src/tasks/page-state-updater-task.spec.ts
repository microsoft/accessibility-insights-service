// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-unsafe-any
import 'reflect-metadata';

import { StorageClient } from 'axis-storage';
import { ItemType, RunResult, RunState, WebsitePage } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { WebsitePageFactory } from '../factories/website-page-factory';
import { ScanMetadata } from '../types/scan-metadata';
import { PageStateUpdaterTask } from './page-state-updater-task';

let storageClientMock: IMock<StorageClient>;
let websitePageFactoryMock: IMock<WebsitePageFactory>;
let pageStateUpdaterTask: PageStateUpdaterTask;

const scanMetadata: ScanMetadata = {
    websiteId: 'websiteId',
    websiteName: 'websiteName',
    baseUrl: 'scanMetadata-baseUrl',
    scanUrl: 'scanMetadata-scanUrl',
    serviceTreeId: 'serviceTreeId',
};

beforeEach(() => {
    storageClientMock = Mock.ofType<StorageClient>();
    websitePageFactoryMock = Mock.ofType<WebsitePageFactory>();
    pageStateUpdaterTask = new PageStateUpdaterTask(storageClientMock.object, websitePageFactoryMock.object);
});

afterEach(() => {
    storageClientMock.verifyAll();
    websitePageFactoryMock.verifyAll();
});

describe('PageStateUpdaterTask', () => {
    it('Set state on insert operation', async () => {
        const runTime = new Date();
        const websitePage = createWebsitePage();

        websitePage.lastRun = {
            state: RunState.running,
            runTime: runTime.toJSON(),
        };
        websitePageFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.readDocument(websitePage.id, websitePage.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 404 }))
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.writeDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setState(RunState.running, scanMetadata, runTime);
    });

    it('Set state on merge operation', async () => {
        const runTime = new Date();
        const websitePage = createWebsitePage();
        websitePage.lastRun = {
            state: RunState.running,
            runTime: runTime.toJSON(),
        };

        websitePageFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.readDocument(websitePage.id, websitePage.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.mergeDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setState(RunState.running, scanMetadata, runTime);
    });

    it('Set on-page links on insert operation', async () => {
        const websitePage = createWebsitePage();
        const crawlerScanResults: CrawlerScanResults = {
            results: [
                {
                    baseUrl: 'baseUrl',
                    scanUrl: 'scanUrl',
                    depth: 1,
                    links: ['url1', 'url2'],
                },
                {
                    baseUrl: 'baseUrl',
                    scanUrl: scanMetadata.scanUrl,
                    depth: 1,
                    links: ['url3', 'url4'],
                },
            ],
        };
        websitePage.links = crawlerScanResults.results[1].links;

        websitePageFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.readDocument(websitePage.id, websitePage.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 404 }))
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.writeDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setOnPageLinks(crawlerScanResults, scanMetadata);
    });

    it('Set on-page links on merge operation', async () => {
        const websitePage = createWebsitePage();
        const crawlerScanResults: CrawlerScanResults = {
            results: [
                {
                    baseUrl: 'baseUrl',
                    scanUrl: 'scanUrl',
                    depth: 1,
                    links: ['url1', 'url2'],
                },
                {
                    baseUrl: 'baseUrl',
                    scanUrl: scanMetadata.scanUrl,
                    depth: 1,
                    links: ['url3', 'url4'],
                },
            ],
        };
        websitePage.links = crawlerScanResults.results[1].links;

        websitePageFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.readDocument(websitePage.id, websitePage.partitionKey))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());
        storageClientMock
            .setup(async o => o.mergeDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 200 }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setOnPageLinks(crawlerScanResults, scanMetadata);
    });
});

function createWebsitePage(): WebsitePage {
    return {
        id: 'id',
        itemType: ItemType.page,
        websiteId: scanMetadata.websiteId,
        baseUrl: scanMetadata.baseUrl,
        url: scanMetadata.scanUrl,
        pageRank: <number>undefined,
        backlinkLastSeen: <string>undefined,
        lastRun: <RunResult>undefined,
        links: undefined,
        partitionKey: 'partitionKey',
    };
}
