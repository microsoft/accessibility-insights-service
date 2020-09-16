// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CrawlSummaryDetails, SummaryScanError, SummaryScanResult, SummaryScanResults } from 'accessibility-insights-report';
import { Spinner } from 'cli-spinner';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
// import { ReportNameGenerator } from '../report/report-name-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults, ScanError } from '../scanner/axe-scan-results';
import { ScanArguments } from '../scanner/scan-arguments';
import { CommandRunner } from './command-runner';

export interface PageError {
    // tslint:disable-next-line:no-reserved-keywords
    url: string;
    error: string;
}

@injectable()
export class FileCommandRunner implements CommandRunner {
    // tslint:disable-next-line: no-object-literal-type-assertion
    private readonly summaryScanResults: SummaryScanResults = {
        failed: [],
        passed: [],
        unscannable: [],
    };

    private readonly errors: PageError[] = [];

    private readonly uniqueUrls = new Set();

    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
        // @inject(ReportNameGenerator) private readonly reportNameGenerator: ReportNameGenerator,
        private readonly fileSystemObj: typeof fs = fs,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        const spinner = new Spinner(`Running scanner... %s \t`);
        spinner.start();
        // tslint:disable-next-line: no-any
        let promise = Promise.resolve();

        const startDate = new Date();
        const startDateNumber = Date.now();

        try {
            const lines = this.fileSystemObj.readFileSync(scanArguments.inputFile, 'utf-8').split(/\r?\n/);

            for (let line of lines) {
                line = line.trim();
                if (!isEmpty(line) && !this.uniqueUrls.has(line)) {
                    this.uniqueUrls.add(line);
                    await promise;
                    promise = this.processUrl(line, scanArguments);
                }
            }
        } finally {
            spinner.stop();
        }

        await promise;

        const endDate = new Date();
        const endDateNumber = Date.now();

        await this.generateSummaryReports(scanArguments, startDate, startDateNumber, endDate, endDateNumber);
    }

    private async generateSummaryReports(
        scanArguments: ScanArguments,
        startDate: Date,
        startDateNumber: number,
        endDate: Date,
        endDateNumber: number,
    ): Promise<void> {
        const durationSeconds = (endDateNumber - startDateNumber) / 1000;
        console.log(`Done in ${durationSeconds}s`);

        const scannedPagesCount = this.summaryScanResults.failed.length + this.summaryScanResults.passed.length;
        const discoveredPagesCount = scannedPagesCount + this.summaryScanResults.unscannable.length;
        console.log(`Scanned ${scannedPagesCount} of ${discoveredPagesCount} pages discovered `);

        const issueCount = this.summaryScanResults.failed.reduce((a, b) => a + b.numFailures, 0);
        console.log(`Found ${issueCount} accessibility issues`);

        const crawlDetails: CrawlSummaryDetails = {
            baseUrl: scanArguments.url,
            basePageTitle: 'Batch Scanning',
            scanStart: startDate,
            scanComplete: endDate,
            durationSeconds: durationSeconds,
        };

        const userAgent = this.scanner.getUserAgent();

        // const reportContent =
        await this.reportGenerator.generateSummaryReport(crawlDetails, this.summaryScanResults, userAgent);

        // const reportLocation = this.reportDiskWriter.writeToDirectory(scanArguments.output, 'index', 'html', reportContent);
        // console.log(`Summary report was saved as ${reportLocation}`);

        // const errorLogName = `${this.reportNameGenerator.generateName('ai-cli-errors', endDate)}.log`;
        // const errorLogLocation = this.reportDiskWriter.writeErrorLogToDirectory(scanArguments.output, errorLogName, this.errors);
        // console.log(`Error log was saved as ${errorLogLocation}`);
    }

    private async processUrl(url: string, scanArguments: ScanArguments): Promise<void> {
        const axeResults = await this.scanner.scan(url);

        if (isNil(axeResults.error)) {
            const reportContent = this.reportGenerator.generateReport(axeResults);
            const reportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, url, 'html', reportContent);

            this.processURLScanResult(url, reportName, axeResults);
        } else {
            const error = axeResults.error as ScanError;

            if (error?.errorType !== undefined) {
                const reportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, url, 'txt', error.stack);

                const summaryScanError: SummaryScanError = {
                    url: url,
                    errorType: error.errorType,
                    errorDescription: error.message,
                    errorLogLocation: reportName,
                };

                this.summaryScanResults.unscannable.push(summaryScanError);
                this.errors.push({ url, error: error.stack });
                console.log(`Couldn't scan ${url}, error details saved in file ${reportName}`);
            } else {
                this.errors.push({ url, error: axeResults.error.toString() });
            }
        }
    }

    private processURLScanResult(url: string, reportName: string, axeResults: AxeScanResults): void {
        if (axeResults.results.violations?.length > 0) {
            // tslint:disable-next-line: strict-boolean-expressions
            const issueCount = axeResults.results.violations.reduce((a, b) => a + b.nodes.length, 0);
            const summaryScanError: SummaryScanResult = {
                url: url,
                reportLocation: reportName,
                numFailures: issueCount,
            };
            this.summaryScanResults.failed.push(summaryScanError);
        } else {
            const issueCount = 0;

            const summaryScanError: SummaryScanResult = {
                url: url,
                reportLocation: reportName,
                numFailures: issueCount,
            };
            this.summaryScanResults.passed.push(summaryScanError);
        }
    }
}
