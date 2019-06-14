// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { PageObjectFactory } from 'service-library';
import { ItemType, RunResult, WebsitePage } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';
import { WebsitePageFactory } from './website-page-factory';

describe('WebsitePageFactory', () => {
    let pageObjectFactoryMock: IMock<PageObjectFactory>;
    let websitePageFactory: WebsitePageFactory;
    const scanMetadata: ScanMetadata = {
        websiteId: 'websiteId',
        websiteName: 'websiteName',
        baseUrl: 'scanMetadata-baseUrl',
        scanUrl: 'scanMetadata-scanUrl',
        serviceTreeId: 'serviceTreeId',
    };

    beforeEach(() => {
        pageObjectFactoryMock = Mock.ofType<PageObjectFactory>();
        websitePageFactory = new WebsitePageFactory(pageObjectFactoryMock.object);
        setupPageObjectFactoryMock();
    });

    it('create when scan url result provided', () => {
        const runTime = new Date();
        const crawlerScanResults = createCrawlerScanResults();
        const expectedResult = createWebsitePageResult(runTime);

        const result = websitePageFactory.createFromLinks(crawlerScanResults, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        pageObjectFactoryMock.verifyAll();
    });

    function setupPageObjectFactoryMock(): void {
        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, 'scanUrl-1-link-1'))
            .returns(() => createPageDocument('baseUrl-scanUrl-1-hash-1', 'scanUrl-1-link-1'))
            .verifiable(Times.once());
        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, 'scanUrl-1-link-2'))
            .returns(() => createPageDocument('baseUrl-scanUrl-1-hash-2', 'scanUrl-1-link-2'))
            .verifiable(Times.once());
        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, 'scanUrl-1-link-3'))
            .returns(() => createPageDocument('baseUrl-scanUrl-1-hash-3', 'scanUrl-1-link-3'))
            .verifiable(Times.once());
        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, 'scanUrl-2-link-1'))
            .returns(() => createPageDocument('baseUrl-scanUrl-2-hash-1', 'scanUrl-2-link-1'))
            .verifiable(Times.once());
        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, 'scanUrl-2-link-2'))
            .returns(() => createPageDocument('baseUrl-scanUrl-2-hash-2', 'scanUrl-2-link-2'))
            .verifiable(Times.once());
        pageObjectFactoryMock
            .setup(o => o.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, 'scanUrl-2-link-3'))
            .returns(() => createPageDocument('baseUrl-scanUrl-2-hash-3', 'scanUrl-2-link-3'))
            .verifiable(Times.once());
    }

    function createPageDocument(id: string, url: string): WebsitePage {
        return {
            id: id,
            itemType: ItemType.page,
            websiteId: scanMetadata.websiteId,
            baseUrl: scanMetadata.baseUrl,
            url: url,
            pageRank: <number>undefined,
            lastReferenceSeen: <string>undefined,
            lastRun: <RunResult>undefined,
            links: <[]>undefined,
            partitionKey: scanMetadata.websiteId,
        };
    }

    function createCrawlerScanResults(): CrawlerScanResults {
        return {
            results: [
                {
                    baseUrl: scanMetadata.baseUrl,
                    scanUrl: 'scanUrl-1',
                    depth: 1,
                    links: ['scanUrl-1-link-1', 'scanUrl-1-link-2', 'scanUrl-1-link-3'],
                },
                {
                    baseUrl: scanMetadata.baseUrl,
                    scanUrl: 'scanUrl-2',
                    depth: 1,
                    links: ['scanUrl-2-link-1', 'scanUrl-2-link-2', 'scanUrl-2-link-3'],
                },
            ],
        };
    }

    function createWebsitePageResult(runTime: Date): WebsitePage[] {
        return [
            {
                id: 'baseUrl-scanUrl-1-hash-1',
                itemType: ItemType.page,
                websiteId: 'websiteId',
                baseUrl: scanMetadata.baseUrl,
                url: 'scanUrl-1-link-1',
                lastReferenceSeen: runTime.toJSON(),
                pageRank: <number>undefined,
                lastRun: <RunResult>undefined,
                links: undefined,
                partitionKey: scanMetadata.websiteId,
            },
            {
                id: 'baseUrl-scanUrl-1-hash-2',
                itemType: ItemType.page,
                websiteId: 'websiteId',
                baseUrl: scanMetadata.baseUrl,
                url: 'scanUrl-1-link-2',
                lastReferenceSeen: runTime.toJSON(),
                pageRank: <number>undefined,
                lastRun: <RunResult>undefined,
                links: undefined,
                partitionKey: scanMetadata.websiteId,
            },
            {
                id: 'baseUrl-scanUrl-1-hash-3',
                itemType: ItemType.page,
                websiteId: 'websiteId',
                baseUrl: scanMetadata.baseUrl,
                url: 'scanUrl-1-link-3',
                lastReferenceSeen: runTime.toJSON(),
                pageRank: <number>undefined,
                lastRun: <RunResult>undefined,
                links: undefined,
                partitionKey: scanMetadata.websiteId,
            },
            {
                id: 'baseUrl-scanUrl-2-hash-1',
                itemType: ItemType.page,
                websiteId: 'websiteId',
                baseUrl: scanMetadata.baseUrl,
                url: 'scanUrl-2-link-1',
                lastReferenceSeen: runTime.toJSON(),
                pageRank: <number>undefined,
                lastRun: <RunResult>undefined,
                links: undefined,
                partitionKey: scanMetadata.websiteId,
            },
            {
                id: 'baseUrl-scanUrl-2-hash-2',
                itemType: ItemType.page,
                websiteId: 'websiteId',
                baseUrl: scanMetadata.baseUrl,
                url: 'scanUrl-2-link-2',
                lastReferenceSeen: runTime.toJSON(),
                pageRank: <number>undefined,
                lastRun: <RunResult>undefined,
                links: undefined,
                partitionKey: scanMetadata.websiteId,
            },
            {
                id: 'baseUrl-scanUrl-2-hash-3',
                itemType: ItemType.page,
                websiteId: 'websiteId',
                baseUrl: scanMetadata.baseUrl,
                url: 'scanUrl-2-link-3',
                lastReferenceSeen: runTime.toJSON(),
                pageRank: <number>undefined,
                lastRun: <RunResult>undefined,
                links: undefined,
                partitionKey: scanMetadata.websiteId,
            },
        ];
    }
});
