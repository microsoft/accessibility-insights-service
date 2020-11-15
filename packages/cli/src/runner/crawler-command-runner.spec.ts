// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as fs from 'fs';
import { Crawler, CrawlerRunOptions } from 'accessibility-insights-crawler';
import { IMock, It, Mock, Times } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ScanArguments } from '../scanner/scan-arguments';
import { ConsolidatedReportGenerator } from '../report/consolidated-report-generator';
import { CrawlerCommandRunner } from './crawler-command-runner';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe('CrawlerCommandRunner', () => {
    const testUrl = 'http://localhost/';

    let testInput: ScanArguments;
    let crawlerOption: CrawlerRunOptions;
    let crawlerMock: IMock<Crawler>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let consolidatedReportGeneratorMock: IMock<ConsolidatedReportGenerator>;
    let fsMock: IMock<typeof fs>;
    let testSubject: CrawlerCommandRunner;

    beforeEach(() => {
        testInput = { url: testUrl, output: './dir' };
        crawlerOption = {
            baseUrl: testInput.url,
            localOutputDir: testInput.output,
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

        crawlerMock = Mock.ofType<Crawler>();
        reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();
        consolidatedReportGeneratorMock = Mock.ofType<ConsolidatedReportGenerator>();
        fsMock = Mock.ofInstance(fs);

        fsMock
            .setup((o) => o.existsSync(testInput.output))
            .returns(() => false)
            .verifiable();

        crawlerMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.resolve())
            .verifiable();

        testSubject = new CrawlerCommandRunner(
            crawlerMock.object,
            consolidatedReportGeneratorMock.object,
            reportDiskWriterMock.object,
            fsMock.object,
        );
    });

    afterEach(() => {
        crawlerMock.verifyAll();
        reportDiskWriterMock.verifyAll();
        consolidatedReportGeneratorMock.verifyAll();
        fsMock.verifyAll();
    });

    it('skip run when last scan data persisted', async () => {
        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(testInput.output))
            .returns(() => true)
            .verifiable();

        crawlerMock.reset();
        crawlerMock.setup((o) => o.crawl(It.isAny())).verifiable(Times.never());

        await testSubject.runCommand(testInput);
    });

    it('continue run with --restart when last scan data persisted', async () => {
        testInput = { url: testUrl, output: './dir', restart: true };
        crawlerOption.restartCrawl = true;

        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(testInput.output))
            .returns(() => true)
            .verifiable();

        crawlerMock.reset();
        crawlerMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.resolve())
            .verifiable();
        await testSubject.runCommand(testInput);
    });

    it('continue run with --continue when last scan data persisted', async () => {
        testInput = { url: testUrl, output: './dir', continue: true };

        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(testInput.output))
            .returns(() => true)
            .verifiable();

        await testSubject.runCommand(testInput);
    });

    it('run crawler', async () => {
        consolidatedReportGeneratorMock
            .setup(async (o) => o.generateReport(testUrl, It.isAny(), It.isAny()))
            .returns(() => Promise.resolve('report'))
            .verifiable();
        reportDiskWriterMock
            .setup((o) => o.writeToDirectory(testInput.output, 'index', 'html', 'report'))
            .returns(() => 'path')
            .verifiable();

        await testSubject.runCommand(testInput);
    });
});
