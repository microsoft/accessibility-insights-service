// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CrawlerEntryPoint, CrawlerRunOptions } from 'accessibility-insights-crawler';
import { IMock, Mock, Times } from 'typemoq';
import { ScanArguments } from '../scanner/scan-arguments';
import { CrawlerCommandRunner } from './crawler-command-runner';

// tslint:disable: no-empty
describe('CrawlerCommandRunner', () => {
    let crawlerEntryPointMock: IMock<CrawlerEntryPoint>;
    let testSubject: CrawlerCommandRunner;
    // tslint:disable-next-line: no-http-string
    const testUrl = 'http://www.bing.com';
    const testInput: ScanArguments = { url: testUrl, output: '/users/xyz' };
    // tslint:disable-next-line: mocha-no-side-effect-code
    beforeEach(() => {
        crawlerEntryPointMock = Mock.ofType<CrawlerEntryPoint>();

        testSubject = new CrawlerCommandRunner(crawlerEntryPointMock.object);
    });

    it('Run Command', async () => {
        const crawlerOption: CrawlerRunOptions = {
            baseUrl: testInput.url,
            localOutputDir: testInput.output,
            existingUrls: undefined,
            discoveryPatterns: undefined,
            simulate: undefined,
            selectors: undefined,
            maxRequestsPerCrawl: undefined,
            restartCrawl: undefined,
            snapshot: undefined,
            memoryMBytes: undefined,
            silentMode: undefined,
            inputFile: undefined,
        };

        crawlerEntryPointMock
            // tslint:disable-next-line:no-object-literal-type-assertion
            .setup((cem) => cem.crawl(crawlerOption))
            .returns(async () => Promise.resolve(undefined))
            .verifiable(Times.once());

        await testSubject.runCommand(testInput);

        crawlerEntryPointMock.verifyAll();
    });
});
