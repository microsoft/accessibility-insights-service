// tslint:disable: no-import-side-effect
import 'reflect-metadata';

import { IMock, Mock, Times, It } from 'typemoq';
import { ScanResultFactory } from '../factories/scan-result-factory';
import { PageScanResultFactory } from '../factories/page-scan-result-factory';
import { WebsitePageFactory } from '../factories/website-page-factory';
import { WebsiteFactory } from '../factories/website-factory';
import { DataFactoryTask } from './data-factory-task';
import { PageScanResult } from '../documents/page-scan-result';
import { ScanMetadata } from '../types/scan-metadata';
import { Website } from '../documents/website';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanResult, IssueScanResults } from '../documents/issue-scan-result';
import { AxeResults } from 'axe-core';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { WebsitePage } from '../documents/website-page';

let scanResultFactoryMock: IMock<ScanResultFactory>;
let pageScanResultFactoryMock: IMock<PageScanResultFactory>;
let websitePageFactoryMock: IMock<WebsitePageFactory>;
let websiteFactoryMock: IMock<WebsiteFactory>;
let dataFactoryTask: DataFactoryTask;

beforeEach(() => {
    scanResultFactoryMock = Mock.ofType<ScanResultFactory>();
    pageScanResultFactoryMock = Mock.ofType<PageScanResultFactory>();
    websitePageFactoryMock = Mock.ofType<WebsitePageFactory>();
    websiteFactoryMock = Mock.ofType<WebsiteFactory>();
    dataFactoryTask = new DataFactoryTask(
        scanResultFactoryMock.object,
        pageScanResultFactoryMock.object,
        websitePageFactoryMock.object,
        websiteFactoryMock.object,
    );
});

describe('DataFactoryTask', () => {
    it('convert to page scan result model', () => {
        const crawlerScanResults = <CrawlerScanResults>(<unknown>{ type: 'CrawlerScanResults' });
        const issueScanResults = <IssueScanResults>(<unknown>{ type: 'IssueScanResults' });
        const scanMetadata = <ScanMetadata>(<unknown>{ type: 'ScanMetadata' });
        const pageScanResult = <PageScanResult>(<unknown>{ type: 'PageScanResult' });

        pageScanResultFactoryMock
            .setup(o => o.create(crawlerScanResults, issueScanResults, scanMetadata, It.isAny()))
            .returns(() => pageScanResult)
            .verifiable(Times.once());

        const result = dataFactoryTask.toPageScanResultModel(crawlerScanResults, issueScanResults, scanMetadata, new Date());

        expect(result).toEqual(pageScanResult);
        pageScanResultFactoryMock.verifyAll();
    });

    it('convert to website page model w/o error', () => {
        const crawlerScanResults = <CrawlerScanResults>(<unknown>{ type: 'CrawlerScanResults' });
        const scanMetadata = <ScanMetadata>(<unknown>{ type: 'ScanMetadata' });
        const websitePages: WebsitePage[] = [<WebsitePage>(<unknown>{ type: 'WebsitePage' })];

        websitePageFactoryMock
            .setup(o => o.create(crawlerScanResults, scanMetadata, It.isAny()))
            .returns(() => websitePages)
            .verifiable(Times.once());

        const result = dataFactoryTask.toWebsitePagesModel(crawlerScanResults, scanMetadata, new Date());

        expect(result).toEqual(websitePages);
        websitePageFactoryMock.verifyAll();
    });

    it('convert to website page model w/ error', () => {
        const crawlerScanResults = <CrawlerScanResults>(<unknown>{ type: 'CrawlerScanResults', error: 'error' });
        const scanMetadata = <ScanMetadata>(<unknown>{ type: 'ScanMetadata' });
        const websitePages: WebsitePage[] = [<WebsitePage>(<unknown>{ type: 'WebsitePage' })];

        websitePageFactoryMock
            .setup(o => o.create(crawlerScanResults, scanMetadata, It.isAny()))
            .returns(() => websitePages)
            .verifiable(Times.never());

        const result = dataFactoryTask.toWebsitePagesModel(crawlerScanResults, scanMetadata, new Date());

        expect(result).toEqual([]);
        websitePageFactoryMock.verifyAll();
    });

    it('convert to scan result model w/ error', () => {
        const axeScanResults = <AxeScanResults>(<unknown>{ type: 'AxeScanResults', error: 'error' });
        const scanMetadata = <ScanMetadata>(<unknown>{ type: 'ScanMetadata' });
        const scanResults: ScanResult[] = [<ScanResult>(<unknown>{ type: 'ScanResult' })];

        scanResultFactoryMock
            .setup(o => o.create(axeScanResults.results, scanMetadata))
            .returns(() => scanResults)
            .verifiable(Times.never());

        const result = dataFactoryTask.toScanResultsModel(axeScanResults, scanMetadata);

        expect(result.results).toEqual([]);
        expect(result.error).toEqual(axeScanResults.error);
        scanResultFactoryMock.verifyAll();
    });

    it('convert to scan result model w/o error', () => {
        const axeScanResults = <AxeScanResults>(
            (<unknown>{ type: 'AxeScanResults', results: [<AxeResults>(<unknown>{ type: 'AxeResults' })] })
        );
        const scanMetadata = <ScanMetadata>(<unknown>{ type: 'ScanMetadata' });
        const scanResults: ScanResult[] = [<ScanResult>(<unknown>{ type: 'ScanResult' })];
        scanResultFactoryMock
            .setup(o => o.create(axeScanResults.results, scanMetadata))
            .returns(() => scanResults)
            .verifiable(Times.once());

        const result = dataFactoryTask.toScanResultsModel(axeScanResults, scanMetadata);

        expect(result.results).toEqual(scanResults);
        scanResultFactoryMock.verifyAll();
    });

    it('update website model', () => {
        const sourceWebsite = <Website>(<unknown>{ type: 'sourceWebsite' });
        const pageScanMetadata = <PageScanResult>(<unknown>{ type: 'PageScanResult' });
        const scanMetadata = <ScanMetadata>(<unknown>{ type: 'ScanMetadata' });
        const website = <Website>(<unknown>{ type: 'Website' });
        websiteFactoryMock
            .setup(o => o.update(sourceWebsite, pageScanMetadata, It.isAny()))
            .returns(() => website)
            .verifiable(Times.once());

        const result = dataFactoryTask.toWebsiteModel(sourceWebsite, pageScanMetadata, scanMetadata, new Date());

        expect(result).toEqual(website);
        websiteFactoryMock.verifyAll();
    });

    it('creat website model', () => {
        const pageScanMetadata = <PageScanResult>(<unknown>{ type: 'PageScanResult' });
        const scanMetadata = <ScanMetadata>(<unknown>{ type: 'ScanMetadata' });
        const website = <Website>(<unknown>{ type: 'Website' });
        websiteFactoryMock
            .setup(o => o.create(pageScanMetadata, scanMetadata, It.isAny()))
            .returns(() => website)
            .verifiable(Times.once());

        const result = dataFactoryTask.toWebsiteModel(undefined, pageScanMetadata, scanMetadata, new Date());

        expect(result).toEqual(website);
        websiteFactoryMock.verifyAll();
    });
});
