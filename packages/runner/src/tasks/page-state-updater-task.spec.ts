// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-unsafe-any
import 'reflect-metadata';

import { CosmosContainerClient } from 'azure-services';
import { PageObjectFactory } from 'service-library';
import { ItemType, PageScanResult, RunResult, RunState, ScanLevel, WebsitePage } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';
import { PageStateUpdaterTask } from './page-state-updater-task';

let pageObjectFactoryMock: IMock<PageObjectFactory>;
let cosmosContainerClientMock: IMock<CosmosContainerClient>;
let pageStateUpdaterTask: PageStateUpdaterTask;

const scanMetadata: ScanMetadata = {
    websiteId: 'websiteId',
    websiteName: 'websiteName',
    baseUrl: 'scanMetadata-baseUrl',
    scanUrl: 'scanMetadata-scanUrl',
    serviceTreeId: 'serviceTreeId',
};

beforeEach(() => {
    pageObjectFactoryMock = Mock.ofType<PageObjectFactory>();
    cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
    pageStateUpdaterTask = new PageStateUpdaterTask(cosmosContainerClientMock.object, pageObjectFactoryMock.object);
});

afterEach(() => {
    pageObjectFactoryMock.verifyAll();
    cosmosContainerClientMock.verifyAll();
});

describe('PageStateUpdaterTask', () => {
    it('Set run state', async () => {
        const runTime = new Date();
        const websitePage = createWebsitePage();
        websitePage.lastRun = {
            state: RunState.running,
            runTime: runTime.toJSON(),
        };

        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        cosmosContainerClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 202, item: websitePage }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setRunningState(scanMetadata, runTime);
    });

    it('Set on-page links', async () => {
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

        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        cosmosContainerClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 202, item: websitePage }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setPageLinks(crawlerScanResults, scanMetadata);
    });

    it('Set final page run state result to completed', async () => {
        const runTime = new Date();
        const websitePage = createWebsitePage();
        websitePage.lastRun = {
            state: RunState.completed,
            runTime: runTime.toJSON(),
            unscannable: false,
        };
        const pageScanResult = createPageScanResult(runTime);

        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        cosmosContainerClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 202, item: websitePage }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setCompleteState(pageScanResult, scanMetadata, runTime);
    });

    it('Set final page run state result to failed', async () => {
        const runTime = new Date();
        const websitePage = createWebsitePage();
        websitePage.lastRun = {
            state: RunState.failed,
            runTime: runTime.toJSON(),
            unscannable: false,
        };
        const pageScanResult = createPageScanResult(runTime);
        pageScanResult.crawl.run.state = RunState.failed;

        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url))
            .returns(() => websitePage)
            .verifiable(Times.once());
        cosmosContainerClientMock
            .setup(async o => o.mergeOrWriteDocument(websitePage))
            .returns(async () => Promise.resolve({ statusCode: 202, item: websitePage }))
            .verifiable(Times.once());

        await pageStateUpdaterTask.setCompleteState(pageScanResult, scanMetadata, runTime);
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
        lastReferenceSeen: <string>undefined,
        lastRun: <RunResult>undefined,
        links: undefined,
        partitionKey: 'partitionKey',
    };
}

function createPageScanResult(runTime: Date): PageScanResult {
    return {
        id: 'baseUrl-scanUrl-1-hash-1',
        itemType: ItemType.pageScanResult,
        websiteId: 'websiteId',
        url: 'scanMetadata-scanUrl',
        crawl: {
            result: { runTime: runTime.toJSON(), links: ['scanUrl-1-link-1'] },
            run: { runTime: runTime.toJSON(), state: RunState.completed },
        },
        scan: {
            result: { runTime: runTime.toJSON(), level: ScanLevel.fail, issues: ['test id 1'] },
            run: { runTime: runTime.toJSON(), state: RunState.completed, unscannable: false },
        },
        partitionKey: scanMetadata.websiteId,
    };
}
