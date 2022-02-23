// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import { CrawlerRunOptions } from 'accessibility-insights-crawler';
import { IMock, It, Mock, Times } from 'typemoq';
import * as MockDate from 'mockdate';
import { ScanArguments } from '../scan-arguments';
import { ConsolidatedReportGenerator } from '../report/consolidated-report-generator';
import { CrawlerParametersBuilder } from '../crawler/crawler-parameters-builder';
import { AICrawler, CombinedScanResult } from '../crawler/ai-crawler';
import { OutputFileWriter } from '../files/output-file-writer';
import { BaselineOptionsBuilder } from '../baseline/baseline-options-builder';
import { BaselineOptions } from '../baseline/baseline-types';
import { BaselineFileUpdater } from '../baseline/baseline-file-updater';
import { ReportNameGenerator } from '../report/report-name-generator';
import { CrawlerCommandRunner } from './crawler-command-runner';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe('CrawlerCommandRunner', () => {
    const testUrl = 'http://localhost/';

    let scanArguments: ScanArguments;
    let crawlerOptions: CrawlerRunOptions;
    let baselineOptions: BaselineOptions;
    let aiCrawlerMock: IMock<AICrawler>;
    let crawlerParametersBuilderMock: IMock<CrawlerParametersBuilder>;
    let outputFileWriterMock: IMock<OutputFileWriter>;
    let consolidatedReportGeneratorMock: IMock<ConsolidatedReportGenerator>;
    let baselineOptionsBuilderMock: IMock<BaselineOptionsBuilder>;
    let baselineFileUpdaterMock: IMock<BaselineFileUpdater>;
    let fsMock: IMock<typeof fs>;
    let reportNameGeneratorMock: IMock<ReportNameGenerator>;
    let testSubject: CrawlerCommandRunner;
    let stubCombinedScanResults: CombinedScanResult;
    let stdout: string[];
    let dateNow: Date;

    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        scanArguments = { url: testUrl, output: './dir' };
        crawlerOptions = {
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
        baselineOptions = undefined;

        stubCombinedScanResults = { urlCount: { total: 1 } } as CombinedScanResult;

        aiCrawlerMock = Mock.ofType<AICrawler>();
        crawlerParametersBuilderMock = Mock.ofType<CrawlerParametersBuilder>();
        outputFileWriterMock = Mock.ofType<OutputFileWriter>();
        consolidatedReportGeneratorMock = Mock.ofType<ConsolidatedReportGenerator>();
        baselineOptionsBuilderMock = Mock.ofType<BaselineOptionsBuilder>();
        baselineFileUpdaterMock = Mock.ofType<BaselineFileUpdater>();
        reportNameGeneratorMock = Mock.ofType(ReportNameGenerator);
        fsMock = Mock.ofInstance(fs);

        fsMock
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => false)
            .verifiable();
        crawlerParametersBuilderMock
            .setup((o) => o.build(It.isAny()))
            .returns(() => crawlerOptions)
            .verifiable();
        baselineOptionsBuilderMock
            .setup((o) => o.build(It.isAny()))
            .returns(() => undefined)
            .verifiable();

        stdout = [];
        const stdoutWriter = (s: string) => stdout.push(s);

        testSubject = new CrawlerCommandRunner(
            aiCrawlerMock.object,
            crawlerParametersBuilderMock.object,
            consolidatedReportGeneratorMock.object,
            outputFileWriterMock.object,
            baselineOptionsBuilderMock.object,
            baselineFileUpdaterMock.object,
            reportNameGeneratorMock.object,
            fsMock.object,
            stdoutWriter,
        );
    });

    afterEach(() => {
        MockDate.reset();
        aiCrawlerMock.verifyAll();
        outputFileWriterMock.verifyAll();
        consolidatedReportGeneratorMock.verifyAll();
        reportNameGeneratorMock.verifyAll();
        fsMock.verifyAll();
    });

    it('skip run when last scan data persisted', async () => {
        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => true)
            .verifiable();

        aiCrawlerMock.setup((o) => o.crawl(It.isAny(), It.isAny())).verifiable(Times.never());

        await testSubject.runCommand(scanArguments);

        expect(stdout).toMatchInlineSnapshot(`
            Array [
              "The last scan result was found on a disk. Use --continue option to continue scan for the last URL provided, or --restart option to delete the last scan result.",
            ]
        `);
    });

    it('continue run with --restart when last scan data persisted', async () => {
        setupReportOutput();

        scanArguments = { url: testUrl, output: './dir', restart: true };
        crawlerOptions.restartCrawl = true;

        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => true)
            .verifiable();

        aiCrawlerMock
            .setup((o) => o.crawl(crawlerOptions, baselineOptions))
            .returns(async () => stubCombinedScanResults)
            .verifiable();

        await testSubject.runCommand(scanArguments);

        expect(stdout).toMatchInlineSnapshot(`
Array [
  "Generating summary scan report...",
  "Summary report was saved as /path/to/report",
]
`);
    });

    it('continue run with --continue when last scan data persisted', async () => {
        setupReportOutput();

        scanArguments = { url: testUrl, output: './dir', continue: true };

        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(scanArguments.output))
            .returns(() => true)
            .verifiable();

        aiCrawlerMock
            .setup((o) => o.crawl(crawlerOptions, baselineOptions))
            .returns(async () => stubCombinedScanResults)
            .verifiable();

        await testSubject.runCommand(scanArguments);

        expect(stdout).toMatchInlineSnapshot(`
Array [
  "Generating summary scan report...",
  "Summary report was saved as /path/to/report",
]
`);
    });

    it('run crawler', async () => {
        setupReportOutput();

        aiCrawlerMock
            .setup((o) => o.crawl(crawlerOptions, baselineOptions))
            .returns(async () => stubCombinedScanResults)
            .verifiable();

        await testSubject.runCommand(scanArguments);

        expect(stdout).toMatchInlineSnapshot(`
            Array [
              "Generating summary scan report...",
              "Summary report was saved as /path/to/report",
            ]
        `);
    });

    it('log browser errors and skip report generation when no scan result generated', async () => {
        stubCombinedScanResults = {
            urlCount: {
                total: 0,
                failed: 0,
                passed: 0,
            },
            errors: [
                {
                    url: 'url',
                    error: 'error',
                },
            ],
        };
        reportNameGeneratorMock
            .setup((o) => o.generateName('ai-cli-browser-errors', dateNow))
            .returns(() => 'logName')
            .verifiable();
        outputFileWriterMock
            .setup((o) =>
                o.writeToDirectory(scanArguments.output, 'logName', 'log', JSON.stringify(stubCombinedScanResults.errors, undefined, 2)),
            )
            .returns(() => '/path/to/log')
            .verifiable();
        aiCrawlerMock
            .setup((o) => o.crawl(crawlerOptions, baselineOptions))
            .returns(async () => stubCombinedScanResults)
            .verifiable();

        await testSubject.runCommand(scanArguments);

        expect(stdout).toMatchInlineSnapshot(`
            Array [
              "Web browser failed to open URL(s). Please check error log for details that was saved as /path/to/log",
              "No scan result found. If this persists, check error log(s), search for a known issue, or file a new one at https://github.com/microsoft/accessibility-insights-service/issues.",
            ]
        `);
    });

    it('runs crawler with baseline options', async () => {
        setupReportOutput();

        baselineOptions = {
            baselineContent: null,
        };

        baselineOptionsBuilderMock.reset();
        baselineOptionsBuilderMock
            .setup((o) => o.build(scanArguments))
            .returns(() => baselineOptions)
            .verifiable();

        aiCrawlerMock
            .setup((o) => o.crawl(crawlerOptions, baselineOptions))
            .returns(async () => stubCombinedScanResults)
            .verifiable();

        await testSubject.runCommand(scanArguments);

        expect(stdout).toMatchInlineSnapshot(`
            Array [
              "Generating summary scan report...",
              "Summary report was saved as /path/to/report",
            ]
        `);
    });

    function setupReportOutput(): void {
        consolidatedReportGeneratorMock
            .setup(async (o) => o.generateReport(stubCombinedScanResults, It.isAny(), It.isAny()))
            .returns(() => Promise.resolve('report'))
            .verifiable();
        outputFileWriterMock
            .setup((o) => o.writeToDirectory(scanArguments.output, 'index', 'html', 'report'))
            .returns(() => '/path/to/report')
            .verifiable();
    }
});
