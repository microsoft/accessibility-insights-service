// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Spinner } from 'cli-spinner';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ConsoleSummaryReportGenerator } from '../report/summary-report/console-summary-report-generator';
import { HtmlSummaryReportGenerator } from '../report/summary-report/html-summary-report-generator';
import { JsonSummaryReportGenerator } from '../report/summary-report/json-summary-report-generator';
import { SummaryReportData } from '../report/summary-report/summary-report-data';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanArguments } from '../scanner/scan-arguments';
import { CommandRunner } from './command-runner';

@injectable()
export class FileCommandRunner implements CommandRunner {
    // tslint:disable-next-line: no-object-literal-type-assertion
    private readonly summaryReportData = {
        violationCountByRuleMap: {},
        failedUrlToReportMap: {},
        passedUrlToReportMap: {},
        unScannableUrls: [],
    } as SummaryReportData;

    private readonly uniqueUrls = new Set();

    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
        @inject(JsonSummaryReportGenerator) private readonly jsonSummaryReportGenerator: JsonSummaryReportGenerator,
        @inject(HtmlSummaryReportGenerator) private readonly htmlSummaryReportGenerator: HtmlSummaryReportGenerator,
        @inject(ConsoleSummaryReportGenerator) private readonly consoleSummaryReportGenerator: ConsoleSummaryReportGenerator,
        private readonly fileSystemObj: typeof fs = fs,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        const spinner = new Spinner(`Running scanner... %s \t`);
        spinner.start();
        // tslint:disable-next-line: no-any
        let promise = Promise.resolve();

        try {
            const lines = this.fileSystemObj.readFileSync(scanArguments.inputFile, 'UTF-8').split(/\r?\n/);

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

        await this.generateSummaryReport(scanArguments);
    }

    private async generateSummaryReport(scanArguments: ScanArguments): Promise<void> {
        console.log(this.consoleSummaryReportGenerator.generateReport(this.summaryReportData));

        const jsonSummaryReportName = this.reportDiskWriter.writeToDirectory(
            scanArguments.output,
            `scan-summary`,
            'json',
            this.jsonSummaryReportGenerator.generateReport(this.summaryReportData),
        );
        console.log(`scan summary json was saved in file ${jsonSummaryReportName}`);

        const htmlSummaryReportName = this.reportDiskWriter.writeToDirectory(
            scanArguments.output,
            `scan-summary`,
            'html',
            this.htmlSummaryReportGenerator.generateReport(this.summaryReportData),
        );
        console.log(`scan summary html was saved in file ${htmlSummaryReportName}`);
    }

    private async processUrl(url: string, scanArguments: ScanArguments): Promise<void> {
        const axeResults = await this.scanner.scan(url);

        if (isNil(axeResults.error)) {
            const reportContent = this.reportGenerator.generateReport(axeResults);
            const reportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, url, 'html', reportContent);

            this.processURLScanResult(url, reportName, axeResults);
        } else {
            this.summaryReportData.unScannableUrls.push(url);
        }
    }

    private processURLScanResult(url: string, reportName: string, axeResults: AxeScanResults): void {
        if (axeResults.results.violations?.length > 0) {
            axeResults.results.violations.forEach((violation) => {
                this.summaryReportData.violationCountByRuleMap[violation.id] =
                    // tslint:disable-next-line: strict-boolean-expressions
                    (this.summaryReportData.violationCountByRuleMap[violation.id]
                        ? this.summaryReportData.violationCountByRuleMap[violation.id]
                        : 0) + violation.nodes.length;
            });

            this.summaryReportData.failedUrlToReportMap[url] = reportName;
        } else {
            this.summaryReportData.passedUrlToReportMap[url] = reportName;
        }
    }
}
