// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as fs from 'fs';
import { CrawlerRunOptions } from 'accessibility-insights-crawler';
import { IMock, It, Mock, Times } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ScanArguments } from '../scan-arguments';
import { ConsolidatedReportGenerator } from '../report/consolidated-report-generator';
import { CrawlerParametersBuilder } from '../crawler-parameters-builder';
import { CrawlerCommandRunner } from './crawler-command-runner';
import { AICrawler } from '../crawler/ai-crawler';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe('CrawlerCommandRunner', () => {
    const testUrl = 'http://localhost/';

    let scanArguments: ScanArguments;
    let crawlerOption: CrawlerRunOptions;
    let crawlerMock: IMock<AICrawler>;
    let crawlerParametersBuilderMock: IMock<CrawlerParametersBuilder>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let consolidatedReportGeneratorMock: IMock<ConsolidatedReportGenerator>;
    let fsMock: IMock<typeof fs>;
    let testSubject: CrawlerCommandRunner;

    beforeEach(() => {
        scanArguments = { url: testUrl, output: './dir' };
        crawlerOption = {
            baseUrl: scanArguments.url,
            localOutputDir: scanArguments.output,
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

        crawlerMock = Mock.ofType<AICrawler>();
        crawlerParametersBuilderMock = Mock.ofType<CrawlerParametersBuilder>();
        reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();
        consolidatedReportGeneratorMock = Mock.ofType<ConsolidatedReportGenerator>();
        fsMock = Mock.ofInstance(fs);

        fsMock
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => false)
            .verifiable();
        crawlerParametersBuilderMock
            .setup(async (o) => o.build(It.isAny()))
            .returns(() => Promise.resolve(crawlerOption))
            .verifiable();
        crawlerMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.resolve({}))
            .verifiable();

        testSubject = new CrawlerCommandRunner(
            crawlerMock.object,
            crawlerParametersBuilderMock.object,
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
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => true)
            .verifiable();

        crawlerMock.reset();
        crawlerMock.setup((o) => o.crawl(It.isAny())).verifiable(Times.never());

        await testSubject.runCommand(scanArguments);
    });

    it('continue run with --restart when last scan data persisted', async () => {
        scanArguments = { url: testUrl, output: './dir', restart: true };
        crawlerOption.restartCrawl = true;

        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => true)
            .verifiable();

        crawlerMock.reset();
        crawlerMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.resolve({}))
            .verifiable();
        await testSubject.runCommand(scanArguments);
    });

    it('continue run with --continue when last scan data persisted', async () => {
        scanArguments = { url: testUrl, output: './dir', continue: true };

        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => true)
            .verifiable();

        await testSubject.runCommand(scanArguments);
    });

    it('run crawler', async () => {
        consolidatedReportGeneratorMock
            .setup(async (o) => o.generateReport({}, It.isAny(), It.isAny()))
            .returns(() => Promise.resolve('report'))
            .verifiable();
        reportDiskWriterMock
            .setup((o) => o.writeToDirectory(scanArguments.output, 'index', 'html', 'report'))
            .returns(() => 'path')
            .verifiable();

        await testSubject.runCommand(scanArguments);
    });
});
