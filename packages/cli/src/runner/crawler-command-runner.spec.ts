// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CrawlerEntryPoint, CrawlerRunOptions, ScanResults } from 'accessibility-insights-crawler';
import * as fs from 'fs';
import { IMock, It, Mock, Times } from 'typemoq';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ReportNameGenerator } from '../report/report-name-generator';
import { ScanArguments } from '../scanner/scan-arguments';
import { CrawlerCommandRunner } from './crawler-command-runner';

// tslint:disable: no-object-literal-type-assertion  no-unsafe-any

describe('CrawlerCommandRunner', () => {
    const testUrl = 'http://localhost/';
    const scanResult: ScanResults = {
        summaryScanResults: {
            failed: [],
            passed: [],
            unscannable: [],
        },
        errors: [],
        scanMetadata: {
            baseUrl: '',
            basePageTitle: '',
            userAgent: '',
        },
    };

    let testInput: ScanArguments;
    let crawlerOption: CrawlerRunOptions;
    let crawlerEntryPointMock: IMock<CrawlerEntryPoint>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let reportDiskWriterMock: IMock<ReportDiskWriter>;
    let reportNameGeneratorMock: IMock<ReportNameGenerator>;
    let fsMock: IMock<typeof fs>;
    let testSubject: CrawlerCommandRunner;

    beforeEach(() => {
        testInput = { url: testUrl, output: './dir' };
        crawlerOption = {
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

        crawlerEntryPointMock = Mock.ofType<CrawlerEntryPoint>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();
        reportNameGeneratorMock = Mock.ofType<ReportNameGenerator>();
        fsMock = Mock.ofInstance(fs);

        fsMock
            .setup((o) => o.existsSync(testInput.output))
            .returns(() => false)
            .verifiable();

        crawlerEntryPointMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.resolve(scanResult))
            .verifiable();

        testSubject = new CrawlerCommandRunner(
            crawlerEntryPointMock.object,
            reportGeneratorMock.object,
            reportDiskWriterMock.object,
            reportNameGeneratorMock.object,
            fsMock.object,
        );
    });

    afterEach(() => {
        crawlerEntryPointMock.verifyAll();
        reportGeneratorMock.verifyAll();
        reportDiskWriterMock.verifyAll();
        reportNameGeneratorMock.verifyAll();
        fsMock.verifyAll();
    });

    it('skip run when last scan data persisted', async () => {
        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(testInput.output))
            .returns(() => true)
            .verifiable();

        crawlerEntryPointMock.reset();
        crawlerEntryPointMock.setup((o) => o.crawl(It.isAny())).verifiable(Times.never());

        await testSubject.runCommand(testInput);
    });

    it('continue run with --restart when last scan data persisted', async () => {
        testInput = { url: testUrl, output: './dir', restart: true };
        crawlerOption = {
            baseUrl: testInput.url,
            localOutputDir: testInput.output,
            existingUrls: undefined,
            discoveryPatterns: undefined,
            simulate: undefined,
            selectors: undefined,
            maxRequestsPerCrawl: undefined,
            restartCrawl: true,
            snapshot: undefined,
            memoryMBytes: undefined,
            silentMode: undefined,
            inputFile: undefined,
        };

        fsMock.reset();
        fsMock
            .setup((o) => o.existsSync(testInput.output))
            .returns(() => true)
            .verifiable();

        crawlerEntryPointMock.reset();
        crawlerEntryPointMock
            .setup((o) => o.crawl(crawlerOption))
            .returns(async () => Promise.resolve(scanResult))
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
        await testSubject.runCommand(testInput);
    });
});
