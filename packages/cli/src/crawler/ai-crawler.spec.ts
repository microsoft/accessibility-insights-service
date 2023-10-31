// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, MockBehavior } from 'typemoq';
import { DbScanResultReader, Crawler, CrawlerRunOptions, ScanMetadata, ScanResult } from 'accessibility-insights-crawler';
import { AxeResults } from 'axe-core';
import { BaselineEngine } from '../baseline/baseline-engine';
import { BaselineEvaluation, BaselineFileContent, BaselineOptions } from '../baseline/baseline-types';
import { AxeResultsReducer } from '../converter/axe-results-reducer';
import { AxeCoreResults } from '../converter/axe-result-types';
import { AICrawler } from './ai-crawler';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(AICrawler, () => {
    const baseUrl = 'http://localhost/';
    const testOutput = './dir';
    let crawler: AICrawler;
    let dbScanResultReaderMock: IMock<DbScanResultReader>;
    let urlsOnlyAxeResultsReducer: AxeResultsReducer;
    let crawlerOption: CrawlerRunOptions;
    let crawlerMock: IMock<Crawler<unknown>>;
    let baselineEngineMock: IMock<BaselineEngine>;

    beforeEach(() => {
        crawlerOption = {
            baseUrl,
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

        // This can't use typemoq because it needs to mutate the accumulator parameter
        // See https://github.com/florinn/typemoq/issues/98
        urlsOnlyAxeResultsReducer = {
            reduce(accumulatedAxeResults: AxeCoreResults, currentAxeResults: AxeResults): void {
                const oldUrls = accumulatedAxeResults.urls ?? [];
                accumulatedAxeResults.urls = [...oldUrls, currentAxeResults.url];
            },
        } as AxeResultsReducer;

        dbScanResultReaderMock = Mock.ofType<DbScanResultReader>();
        crawlerMock = Mock.ofType<Crawler<unknown>>();
        baselineEngineMock = Mock.ofType<BaselineEngine>(null, MockBehavior.Strict);

        crawler = new AICrawler(crawlerMock.object, dbScanResultReaderMock.object, urlsOnlyAxeResultsReducer, baselineEngineMock.object);
    });

    afterEach(() => {
        crawlerMock.verifyAll();
        baselineEngineMock.verifyAll();
    });

    describe('crawl with working deps', () => {
        let scanMetadata: ScanMetadata;
        let scanResults: ScanResult[];

        beforeEach(() => {
            scanMetadata = {
                baseUrl,
                basePageTitle: 'basePageTitle',
                userAgent: 'userAgent',
                browserResolution: '1920x1080',
            } as ScanMetadata;
            scanResults = [
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
                    url: 'url-4',
                    error: 'error 4',
                },
                {
                    id: 'id-5',
                    scanState: 'browserError',
                    url: 'url-5',
                    error: {
                        errorType: 'HttpErrorCode',
                        statusCode: 404,
                        message: 'message',
                        stack: 'stack',
                    },
                },
            ] as ScanResult[];

            for (let index = 0; index <= scanResults.length; index++) {
                const next = index === scanResults.length ? { done: true, value: undefined } : { done: false, value: scanResults[index] };
                dbScanResultReaderMock
                    .setup(async (o) => o.next())
                    .returns(() => Promise.resolve(next))
                    .verifiable();
            }

            dbScanResultReaderMock
                .setup((o) => o.getScanMetadata(baseUrl))
                .returns(() => Promise.resolve(scanMetadata))
                .verifiable();
            dbScanResultReaderMock.setup((o) => o[Symbol.asyncIterator]).returns(() => () => dbScanResultReaderMock.object);
        });

        it('coordinates underlying crawler and results reader (without baselining)', async () => {
            crawlerMock
                .setup((o) => o.crawl(crawlerOption))
                .returns(async () => Promise.resolve())
                .verifiable();

            const output = await crawler.crawl(crawlerOption);

            expect(output.baselineEvaluation).toBeUndefined();
            expect(output.scanMetadata).toBe(scanMetadata);
            expect(output.urlCount).toStrictEqual({
                total: 3,
                passed: 2,
                failed: 1,
            });
            expect(output.combinedAxeResults.urls).toStrictEqual(['url-1', 'url-2', 'url-3']);
        });

        it('coordinates underlying crawler, results reader, and baselining engine', async () => {
            crawlerMock
                .setup((o) => o.crawl(crawlerOption))
                .returns(async () => Promise.resolve())
                .verifiable();

            const stubBaselineContent: BaselineFileContent = {} as BaselineFileContent;
            const baselineOptions: BaselineOptions = {
                baselineContent: stubBaselineContent,
                urlNormalizer: (url) => `${url} (normalized)`,
            };
            const baselineEvaluationFromEngine: BaselineEvaluation = {} as BaselineEvaluation;

            baselineEngineMock
                .setup((bem) => bem.updateResultsInPlace(It.isAny(), baselineOptions))
                .returns(() => baselineEvaluationFromEngine)
                .verifiable();

            const output = await crawler.crawl(crawlerOption, baselineOptions);

            expect(output.baselineEvaluation).toBe(baselineEvaluationFromEngine);
            expect(output.scanMetadata).toBe(scanMetadata);
            expect(output.urlCount).toStrictEqual({
                total: 3,
                passed: 2,
                failed: 1,
            });
            expect(output.combinedAxeResults.urls).toStrictEqual(['url-1', 'url-2', 'url-3']);
        });

        it('coordinates underlying crawler, results reader, and baselining engine, single worker true, non-deterministic', async () => {
            const stubBaselineContent: BaselineFileContent = {} as BaselineFileContent;
            const baselineOptions: BaselineOptions = {
                baselineContent: stubBaselineContent,
                urlNormalizer: (url) => `${url} (normalized)`,
            };

            crawlerOption.singleWorker = false;
            crawlerOption.maxRequestsPerCrawl = 2;

            crawlerMock
                .setup((o) => o.crawl(crawlerOption))
                .returns(async () => Promise.resolve())
                .verifiable();

            await expect(crawler.crawl(crawlerOption, baselineOptions)).rejects.toEqual(
                new Error(AICrawler.NON_DETERMINISTIC_ERROR_MESSAGE),
            );
        });

        it('propagates exceptions from the web browser', async () => {
            crawlerMock
                .setup((o) => o.crawl(crawlerOption))
                .returns(() => Promise.resolve())
                .verifiable();
            const expectedErrors = [
                { error: 'error 4', url: 'url-4' },
                { error: '{"errorType":"HttpErrorCode","statusCode":404,"message":"message","stack":"stack"}', url: 'url-5' },
            ];

            const output = await crawler.crawl(crawlerOption);

            expect(output.errors).toEqual(expectedErrors);
        });

        it('propagates exceptions from the underlying crawler as-is', async () => {
            crawlerMock
                .setup((o) => o.crawl(crawlerOption))
                .returns(() => Promise.reject('Internal error'))
                .verifiable();

            await expect(crawler.crawl(crawlerOption)).rejects.toEqual('Internal error');
        });
    });
});
