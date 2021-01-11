// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { DbScanResultReader, Crawler, CrawlerRunOptions, ScanMetadata, ScanResult } from 'accessibility-insights-crawler';
import { AxeResultsReducer, AxeCoreResults, AxeResults } from 'axe-result-converter';
import { AICrawler } from './ai-crawler';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(AICrawler, () => {
    const testUrl = 'http://localhost/';
    const testOutput = './dir';
    let crawler: AICrawler;
    let dbScanResultReaderMock: IMock<DbScanResultReader>;
    let axeResultsReducerMock: IMock<AxeResultsReducer>;
    let crawlerOption: CrawlerRunOptions;
    let crawlerMock: IMock<Crawler>;

    beforeEach(() => {
        crawlerOption = {
            baseUrl: testUrl,
            localOutputDir: testOutput,
            inputUrls: undefined,
            discoveryPatterns: undefined,
            simulate: undefined,
            selectors: undefined,
            maxRequestsPerCrawl: undefined,
            restartCrawl: undefined,
            snapshot: undefined,
            memoryMBytes: undefined,
            silentMode: undefined,
        };

        dbScanResultReaderMock = Mock.ofType<DbScanResultReader>();
        axeResultsReducerMock = Mock.ofType<AxeResultsReducer>();
        crawlerMock = Mock.ofType<Crawler>();

        crawler = new AICrawler(crawlerMock.object, dbScanResultReaderMock.object, axeResultsReducerMock.object);
    });

    it('crawl', async () => {
        const baseUrl = 'baseUrl-1';
        const scanMetadata = {
            baseUrl,
            basePageTitle: 'basePageTitle',
            userAgent: 'userAgent',
            browserResolution: '1920x1080',
        } as ScanMetadata;
        const combinedAxeResults = {
            violations: new AxeResults(),
            passes: new AxeResults(),
            incomplete: new AxeResults(),
            inapplicable: new AxeResults(),
        } as AxeCoreResults;
        const scanResults = [
            {
                id: 'id-1',
                scanState: 'pass',
                axeResults: { url: 'url-1' },
            },
            {
                id: 'id-2',
                scanState: 'fail',
                axeResults: { url: 'url-2' },
            },
            {
                id: 'id-3',
                scanState: 'pass',
                axeResults: { url: 'url-3' },
            },
            {
                id: 'id-4',
                scanState: 'runError',
            },
        ] as ScanResult[];

        crawlerMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.resolve())
            .verifiable();

        for (let index = 0; index <= scanResults.length; index++) {
            const next = index === scanResults.length ? { done: true, value: undefined } : { done: false, value: scanResults[index] };
            dbScanResultReaderMock
                .setup(async (o) => o.next())
                .returns(() => Promise.resolve(next))
                .verifiable();
            if (next.done === false && scanResults[index].axeResults !== undefined) {
                axeResultsReducerMock
                    .setup((o) => o.reduce(It.isValue(combinedAxeResults), It.isValue(scanResults[index].axeResults)))
                    .verifiable();
            }
        }

        dbScanResultReaderMock
            .setup(async (o) => o.getScanMetadata(baseUrl))
            .returns(() => Promise.resolve(scanMetadata))
            .verifiable();
        dbScanResultReaderMock.setup((o) => o[Symbol.asyncIterator]).returns(() => () => dbScanResultReaderMock.object);

        await crawler.crawl(crawlerOption);

        crawlerMock.verifyAll();
        axeResultsReducerMock.verifyAll();
    });

    it('crawling fail', async () => {
        crawlerMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.reject())
            .verifiable();

        await crawler.crawl(crawlerOption);

        crawlerMock.verifyAll();
    });
});
