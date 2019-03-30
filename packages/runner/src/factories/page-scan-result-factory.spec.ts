// tslint:disable: no-import-side-effect
import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { HashGenerator } from '../common/hash-generator';
import { ScanMetadata } from '../types/scan-metadata';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { IssueScanResults, Product, ResultLevel } from '../documents/issue-scan-result';
import { PageScanResult } from '../documents/page-scan-result';
import { RunState, ScanLevel } from '../documents/states';
import { PageScanResultFactory } from './page-scan-result-factory';

describe('PageScanResultFactory', () => {
    let hashGeneratorMock: IMock<HashGenerator>;
    let pageScanResultFactory: PageScanResultFactory;
    const scanMetadata: ScanMetadata = {
        websiteId: 'websiteId',
        websiteName: 'websiteName',
        baseUrl: 'scanMetadata-baseUrl',
        scanUrl: 'scanMetadata-scanUrl',
        serviceTreeId: 'serviceTreeId',
    };

    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        pageScanResultFactory = new PageScanResultFactory(hashGeneratorMock.object);
    });

    it('create success scan and crawl result', () => {
        const runTime = new Date();
        setupHashGenerator(runTime);
        const crawlerScanResults = createCrawlerScanResults();
        const issueScanResults = createIssueScanResults();
        const expectedResult = createPageScanResult(runTime);

        const result = pageScanResultFactory.create(crawlerScanResults, issueScanResults, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });

    it('create fail crawl result and success scan result', () => {
        const runTime = new Date();
        setupHashGenerator(runTime);
        const crawlerScanResults = {
            error: 'crawl error',
        };
        const issueScanResults = createIssueScanResults();
        const expectedResult = createPageScanResult(runTime);
        expectedResult.crawl = { run: { runTime: runTime.toJSON(), state: RunState.failed, error: 'crawl error' } };

        const result = pageScanResultFactory.create(crawlerScanResults, issueScanResults, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });

    it('create fail scan result and success crawl result', () => {
        const runTime = new Date();
        setupHashGenerator(runTime);
        const issueScanResults = {
            error: 'crawl error',
        };
        const crawlerScanResults = createCrawlerScanResults();
        const expectedResult = createPageScanResult(runTime);
        expectedResult.scan = { run: { runTime: runTime.toJSON(), state: RunState.failed, error: 'crawl error' } };

        const result = pageScanResultFactory.create(crawlerScanResults, issueScanResults, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });

    function setupHashGenerator(runTime: Date): void {
        hashGeneratorMock
            .setup(b => b.getPageScanResultDocumentId(scanMetadata.baseUrl, scanMetadata.scanUrl, runTime.valueOf()))
            .returns(() => 'baseUrl-scanUrl-1-hash-1')
            .verifiable(Times.once());
    }

    function createPageScanResult(runTime: Date): PageScanResult {
        return {
            id: 'baseUrl-scanUrl-1-hash-1',
            websiteId: 'websiteId',
            url: 'scanMetadata-scanUrl',
            crawl: {
                result: { runTime: runTime.toJSON(), links: ['scanUrl-1-link-1', 'scanUrl-1-link-2', 'scanUrl-1-link-3'] },
                run: { runTime: runTime.toJSON(), state: RunState.completed },
            },
            scan: {
                result: { runTime: runTime.toJSON(), level: ScanLevel.fail, issues: ['test id 1', 'test id 2'] },
                run: { runTime: runTime.toJSON(), state: RunState.completed },
            },
        };
    }

    function createCrawlerScanResults(): CrawlerScanResults {
        return {
            results: [
                {
                    baseUrl: scanMetadata.baseUrl,
                    scanUrl: scanMetadata.scanUrl,
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

    // tslint:disable-next-line:max-func-body-length
    function createIssueScanResults(): IssueScanResults {
        const productInfo: Product = {
            id: 'test product id',
            name: 'test name',
            baseUrl: 'test base url',
            serviceTreeId: 'test service tree id',
        };

        return {
            results: [
                {
                    id: 'test id 1',
                    result: {
                        ruleId: 'test rule id1',
                        level: ResultLevel.error,
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'scanUrl-1',
                                    },
                                    region: {
                                        snippet: {
                                            text: 'test html1',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '#class1;#class2',
                            },
                        ],
                    },
                    product: productInfo,
                },
                {
                    id: 'test id 2',
                    result: {
                        ruleId: 'test rule id2',
                        level: ResultLevel.error,
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'scanUrl-1',
                                    },
                                    region: {
                                        snippet: {
                                            text: 'test html2',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '#class3;#class4',
                            },
                        ],
                    },
                    product: productInfo,
                },
            ],
        };
    }
});
