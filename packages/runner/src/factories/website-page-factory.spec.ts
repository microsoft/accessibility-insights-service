// tslint:disable: no-import-side-effect
import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { ScanMetadata } from '../types/scan-metadata';
import { HashGenerator } from '../common/hash-generator';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { WebsitePage } from '../documents/website-page';
import { WebsitePageFactory } from './website-page-factory';

describe('WebsitePageFactory', () => {
    let hashGeneratorMock: IMock<HashGenerator>;
    let websitePageFactory: WebsitePageFactory;
    const scanMetadata: ScanMetadata = {
        websiteId: 'websiteId',
        websiteName: 'websiteName',
        baseUrl: 'scanMetadata-baseUrl',
        scanUrl: 'scanMetadata-scanUrl',
        serviceTreeId: 'serviceTreeId',
    };

    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        setupHashGenerator();
        websitePageFactory = new WebsitePageFactory(hashGeneratorMock.object);
    });

    it('create when scan url result provided', () => {
        const runTime = new Date();
        const crawlerScanResults = createCrawlerScanResults();
        const expectedResult = createWebsitePageResult(runTime);

        const result = websitePageFactory.create(crawlerScanResults, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });

    function setupHashGenerator(): void {
        hashGeneratorMock
            .setup(b => b.getWebsitePageDocumentId(scanMetadata.baseUrl, 'scanUrl-1-link-1'))
            .returns(() => 'baseUrl-scanUrl-1-hash-1')
            .verifiable(Times.once());
        hashGeneratorMock
            .setup(b => b.getWebsitePageDocumentId(scanMetadata.baseUrl, 'scanUrl-1-link-2'))
            .returns(() => 'baseUrl-scanUrl-1-hash-2')
            .verifiable(Times.once());
        hashGeneratorMock
            .setup(b => b.getWebsitePageDocumentId(scanMetadata.baseUrl, 'scanUrl-1-link-3'))
            .returns(() => 'baseUrl-scanUrl-1-hash-3')
            .verifiable(Times.once());
        hashGeneratorMock
            .setup(b => b.getWebsitePageDocumentId(scanMetadata.baseUrl, 'scanUrl-2-link-1'))
            .returns(() => 'baseUrl-scanUrl-2-hash-1')
            .verifiable(Times.once());
        hashGeneratorMock
            .setup(b => b.getWebsitePageDocumentId(scanMetadata.baseUrl, 'scanUrl-2-link-2'))
            .returns(() => 'baseUrl-scanUrl-2-hash-2')
            .verifiable(Times.once());
        hashGeneratorMock
            .setup(b => b.getWebsitePageDocumentId(scanMetadata.baseUrl, 'scanUrl-2-link-3'))
            .returns(() => 'baseUrl-scanUrl-2-hash-3')
            .verifiable(Times.once());
    }

    function createCrawlerScanResults(): CrawlerScanResults {
        return {
            results: [
                {
                    baseUrl: 'baseUrl',
                    scanUrl: 'scanUrl-1',
                    depth: 1,
                    links: ['scanUrl-1-link-1', 'scanUrl-1-link-2', 'scanUrl-1-link-3'],
                },
                {
                    baseUrl: 'baseUrl',
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
                page: { websiteId: 'websiteId', url: 'scanUrl-1-link-1', lastSeen: runTime.toJSON() },
            },
            {
                id: 'baseUrl-scanUrl-1-hash-2',
                page: { websiteId: 'websiteId', url: 'scanUrl-1-link-2', lastSeen: runTime.toJSON() },
            },
            {
                id: 'baseUrl-scanUrl-1-hash-3',
                page: { websiteId: 'websiteId', url: 'scanUrl-1-link-3', lastSeen: runTime.toJSON() },
            },
            {
                id: 'baseUrl-scanUrl-2-hash-1',
                page: { websiteId: 'websiteId', url: 'scanUrl-2-link-1', lastSeen: runTime.toJSON() },
            },
            {
                id: 'baseUrl-scanUrl-2-hash-2',
                page: { websiteId: 'websiteId', url: 'scanUrl-2-link-2', lastSeen: runTime.toJSON() },
            },
            {
                id: 'baseUrl-scanUrl-2-hash-3',
                page: { websiteId: 'websiteId', url: 'scanUrl-2-link-3', lastSeen: runTime.toJSON() },
            },
        ];
    }
});
