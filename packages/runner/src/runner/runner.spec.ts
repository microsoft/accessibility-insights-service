// tslint:disable: no-object-literal-type-assertion no-unsafe-any
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { Browser } from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { IssueScanResults } from '../documents/issue-scan-result';
import { ItemType } from '../documents/item-type';
import { PageScanResult } from '../documents/page-scan-result';
import { RunState } from '../documents/states';
import { WebsitePage } from '../documents/website-page';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { CrawlerTask } from '../tasks/crawler-task';
import { DataFactoryTask } from '../tasks/data-factory-task';
import { ScannerTask } from '../tasks/scanner-task';
import { StorageTask } from '../tasks/storage-task';
import { WebDriverTask } from '../tasks/web-driver-task';
import { WebsiteStateUpdaterTask } from '../tasks/website-state-updater-task';
import { ScanMetadata } from '../types/scan-metadata';
import { Runner } from './runner';

let runner: Runner;
let browser: Browser;
let crawlerTaskMock: IMock<CrawlerTask>;
let webDriverTaskMock: IMock<WebDriverTask>;
let scannerTaskMock: IMock<ScannerTask>;
let storageTaskMock: IMock<StorageTask>;
let dataFactoryTaskMock: IMock<DataFactoryTask>;
let websiteStateUpdaterTaskMock: IMock<WebsiteStateUpdaterTask>;
const scanMetadata: ScanMetadata = {
    websiteId: 'websiteId',
    websiteName: 'websiteName',
    baseUrl: 'baseUrl',
    scanUrl: 'scanUrl',
    serviceTreeId: 'serviceTreeId',
};
const crawlerScanResults: CrawlerScanResults = {
    error: 'crawlerScanResults',
};
const issueScanResults: IssueScanResults = {
    error: 'issueScanResults',
};
const websitePages: WebsitePage[] = [
    {
        id: 'id',
        itemType: ItemType.page,
        page: {
            websiteId: 'websiteId',
            url: 'url',
            lastSeen: 'lastSeen4',
        },
        partitionKey: scanMetadata.websiteId,
    },
];
const pageScanResult: PageScanResult = {
    id: 'id',
    itemType: ItemType.pageScanResult,
    websiteId: 'websiteId',
    url: 'url',
    crawl: {
        run: {
            runTime: 'runTime',
            state: RunState.completed,
        },
    },
    scan: {
        run: {
            runTime: 'runTime',
            state: RunState.completed,
        },
    },
    partitionKey: scanMetadata.websiteId,
};
// tslint:disable-next-line: mocha-no-side-effect-code
const axeScanResults: AxeScanResults = {
    results: {
        url: 'url',
        timestamp: 'timestamp',
        passes: [
            {
                id: 'id',
                impact: 'minor',
                description: 'description',
                help: 'help',
                helpUrl: 'helpUrl',
                tags: [],
                nodes: [
                    {
                        html: 'html',
                        impact: 'minor',
                        target: ['target'],
                        any: [],
                        all: [],
                        none: [],
                    },
                ],
            },
        ],
        violations: [],
        incomplete: [],
        inapplicable: [],
    } as AxeResults,
};

let scanMetadataConfig: IMock<ScanMetadataConfig>;

beforeEach(() => {
    browser = <Browser>{};
    crawlerTaskMock = Mock.ofType<CrawlerTask>();
    webDriverTaskMock = Mock.ofType<WebDriverTask>();
    scannerTaskMock = Mock.ofType<ScannerTask>();
    storageTaskMock = Mock.ofType<StorageTask>();
    dataFactoryTaskMock = Mock.ofType<DataFactoryTask>();
    websiteStateUpdaterTaskMock = Mock.ofType<WebsiteStateUpdaterTask>();
    scanMetadataConfig = Mock.ofType(ScanMetadataConfig);

    scanMetadataConfig.setup(s => s.getConfig()).returns(() => scanMetadata);
});

describe('runner', () => {
    it('run scan workflow', async () => {
        webDriverTaskMock
            .setup(async o => o.launch())
            .returns(async () => Promise.resolve(browser))
            .verifiable(Times.once());
        webDriverTaskMock
            .setup(async o => o.close())
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        dataFactoryTaskMock
            .setup(o => o.toWebsitePagesModel(crawlerScanResults, scanMetadata, It.isAny()))
            .returns(() => websitePages)
            .verifiable(Times.once());
        dataFactoryTaskMock
            .setup(o => o.toScanResultsModel(axeScanResults, scanMetadata))
            .returns(() => issueScanResults)
            .verifiable(Times.once());
        dataFactoryTaskMock
            .setup(o => o.toPageScanResultModel(crawlerScanResults, issueScanResults, scanMetadata, It.isAny()))
            .returns(() => pageScanResult)
            .verifiable(Times.once());

        storageTaskMock
            .setup(async o => o.storeResult(pageScanResult, scanMetadata.websiteId))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        storageTaskMock
            .setup(async o => o.storeResults(websitePages, scanMetadata.websiteId))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        storageTaskMock
            .setup(async o => o.storeResults(issueScanResults.results, scanMetadata.websiteId))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        crawlerTaskMock
            .setup(async o => o.crawl(scanMetadata.scanUrl, browser))
            .returns(async () => Promise.resolve(crawlerScanResults))
            .verifiable(Times.once());

        scannerTaskMock
            .setup(async o => o.scan(scanMetadata.scanUrl))
            .returns(async () => Promise.resolve(axeScanResults))
            .verifiable(Times.once());

        websiteStateUpdaterTaskMock
            .setup(async o => o.update(pageScanResult, scanMetadata, It.isAny()))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        runner = new Runner(
            crawlerTaskMock.object,
            scannerTaskMock.object,
            websiteStateUpdaterTaskMock.object,
            dataFactoryTaskMock.object,
            webDriverTaskMock.object,
            storageTaskMock.object,
            scanMetadataConfig.object,
        );

        await runner.run();

        crawlerTaskMock.verifyAll();
        scannerTaskMock.verifyAll();
        websiteStateUpdaterTaskMock.verifyAll();
        dataFactoryTaskMock.verifyAll();
        webDriverTaskMock.verifyAll();
        storageTaskMock.verifyAll();
    });
});
