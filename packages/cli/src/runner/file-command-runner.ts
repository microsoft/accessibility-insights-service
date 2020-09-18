// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CrawlSummaryDetails, SummaryScanError, SummaryScanResult, SummaryScanResults } from 'accessibility-insights-report';
import { Spinner } from 'cli-spinner';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ReportNameGenerator } from '../report/report-name-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults, ScanError } from '../scanner/axe-scan-results';
import { ScanArguments } from '../scanner/scan-arguments';
import { CommandRunner } from './command-runner';

export interface PageError {
    url: string;
    error: string;
}

@injectable()
export class FileCommandRunner implements CommandRunner {
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
        @inject(ReportNameGenerator) private readonly reportNameGenerator: ReportNameGenerator,
        private readonly fileSystemObj: typeof fs = fs,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        const spinner = new Spinner(`Running scanner... %s \t`);
        spinner.start();

        const startDate = new Date();
        try {
            const lines = this.fileSystemObj.readFileSync(scanArguments.inputFile, 'utf-8').split(/\r?\n/);
            for (let line of lines) {
                line = line.trim();
                if (!isEmpty(line) && !this.uniqueUrls.has(line)) {
                    this.uniqueUrls.add(line);
                    await this.processUrl(line, scanArguments);
                }
            }
        } finally {
            spinner.stop();
        }

        const endDate = new Date();
        this.reportDiskWriter.copyToDirectory(scanArguments.inputFile, scanArguments.output);
        await this.generateSummaryReports(scanArguments, startDate, endDate);
    }

    private async generateSummaryReports(scanArguments: ScanArguments, startDate: Date, endDate: Date): Promise<void> {
        const durationSeconds = (endDate.valueOf() - startDate.valueOf()) / 1000;
        console.log(`Done in ${durationSeconds} seconds`);

        const scannedPagesCount = this.summaryScanResults.failed.length + this.summaryScanResults.passed.length;
        const discoveredPagesCount = scannedPagesCount + this.summaryScanResults.unscannable.length;
        console.log(`Scanned ${scannedPagesCount} of ${discoveredPagesCount} pages discovered`);

        const issueCount = this.summaryScanResults.failed.reduce((a, b) => a + b.numFailures, 0);
        console.log(`Found ${issueCount} accessibility issues`);

        const crawlDetails: CrawlSummaryDetails = {
            baseUrl: scanArguments.inputFile,
            basePageTitle: '',
            scanStart: startDate,
            scanComplete: endDate,
            durationSeconds: durationSeconds,
        };

        const reportContent = await this.reportGenerator.generateSummaryReport(
            crawlDetails,
            this.summaryScanResults,
            this.scanner.getUserAgent(),
        );

        const reportLocation = this.reportDiskWriter.writeToDirectory(scanArguments.output, 'index', 'html', reportContent);
        console.log(`Summary report was saved as ${reportLocation}`);

        if (this.errors.length > 0) {
            const errorLogName = `${this.reportNameGenerator.generateName('ai-cli-errors', endDate)}.log`;
            const errorLogLocation = this.reportDiskWriter.writeErrorLogToDirectory(scanArguments.output, errorLogName, this.errors);
            console.log(`Error log was saved as ${errorLogLocation}`);
        }
    }

    private async processUrl(url: string, scanArguments: ScanArguments): Promise<void> {
        const axeResults = await this.scanner.scan(url);

        if (isNil(axeResults.error)) {
            const reportContent = this.reportGenerator.generateReport(axeResults);
            const reportName = this.reportDiskWriter.writeToDirectory(`${scanArguments.output}\\data`, url, 'html', reportContent);
            this.processURLScanResult(url, reportName, axeResults);
        } else {
            const error = axeResults.error as ScanError;
            if (error?.errorType !== undefined) {
                const reportName = this.reportDiskWriter.writeToDirectory(`${scanArguments.output}\\data`, url, 'txt', error.stack);
                const summaryScanError: SummaryScanError = {
                    url,
                    errorType: error.errorType,
                    errorDescription: error.message,
                    errorLogLocation: reportName,
                };

                this.summaryScanResults.unscannable.push(summaryScanError);
                this.errors.push({ url, error: error.stack });
                console.log(`Unable to scan page ${url}, ${error.message}`);
            } else {
                this.errors.push({ url, error: axeResults.error.toString() });
                console.log(`Unable to scan page ${url}, ${axeResults.error.toString()}`);
            }
        }
    }

    private processURLScanResult(url: string, reportName: string, axeResults: AxeScanResults): void {
        if (axeResults.results.violations?.length > 0) {
            // tslint:disable-next-line: strict-boolean-expressions
            const issueCount = axeResults.results.violations.reduce((a, b) => a + b.nodes.length, 0);
            const summaryScanError: SummaryScanResult = {
                url,
                reportLocation: reportName,
                numFailures: issueCount,
            };
            this.summaryScanResults.failed.push(summaryScanError);
        } else {
            const summaryScanError: SummaryScanResult = {
                url,
                reportLocation: reportName,
                numFailures: 0,
            };
            this.summaryScanResults.passed.push(summaryScanError);
        }
    }
}
