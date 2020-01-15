// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-object-literal-type-assertion no-unsafe-any
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { IssueScanResults, ItemType, PageScanResult, RunState, WebsitePage } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from '../../test-utilities/mockable-logger';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { CrawlerTask } from '../tasks/crawler-task';
import { DataFactoryTask } from '../tasks/data-factory-task';
import { PageStateUpdaterTask } from '../tasks/page-state-updater-task';
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
let scanMetadataConfig: IMock<ScanMetadataConfig>;
let pageStateUpdaterTaskMock: IMock<PageStateUpdaterTask>;
let loggerMock: IMock<MockableLogger>;

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
        websiteId: 'websiteId',
        baseUrl: 'baseUrl',
        url: 'url',
        pageRank: 0,
        lastReferenceSeen: 'lastReferenceSeen',
        lastRun: {
            runTime: '2019-06-01T00:00:00.000Z',
            state: RunState.completed,
        },
        links: [],
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
    pageResponseCode: 101,
    pageTitle: 'sample page title',
};

beforeEach(() => {
    browser = <Browser>{};
    crawlerTaskMock = Mock.ofType<CrawlerTask>();
    webDriverTaskMock = Mock.ofType<WebDriverTask>();
    scannerTaskMock = Mock.ofType<ScannerTask>();
    storageTaskMock = Mock.ofType<StorageTask>();
    dataFactoryTaskMock = Mock.ofType<DataFactoryTask>();
    websiteStateUpdaterTaskMock = Mock.ofType<WebsiteStateUpdaterTask>();
    scanMetadataConfig = Mock.ofType(ScanMetadataConfig);
    pageStateUpdaterTaskMock = Mock.ofType(PageStateUpdaterTask);
    loggerMock = Mock.ofType(MockableLogger);

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
            .setup(async o => o.writeResult(pageScanResult, scanMetadata.websiteId))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        storageTaskMock
            .setup(async o => o.mergeResults(websitePages, scanMetadata.websiteId))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        storageTaskMock
            .setup(async o => o.writeResults(issueScanResults.results, scanMetadata.websiteId))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        crawlerTaskMock
            .setup(async o => o.crawl(scanMetadata.scanUrl, scanMetadata.baseUrl, browser))
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

        pageStateUpdaterTaskMock
            .setup(async o => o.setRunningState(scanMetadata, It.isAny()))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        pageStateUpdaterTaskMock
            .setup(async o => o.setPageLinks(crawlerScanResults, scanMetadata))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        pageStateUpdaterTaskMock
            .setup(async o => o.setCompleteState(pageScanResult, scanMetadata, It.isAny()))
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
            pageStateUpdaterTaskMock.object,
            loggerMock.object,
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
