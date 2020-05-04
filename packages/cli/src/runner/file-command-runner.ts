// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Spinner } from 'cli-spinner';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import * as lodash from 'lodash';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ConsoleSummaryReportGenerator } from '../report/summary-report/console-summary-report-generator';
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
        urlToReportMap: {},
    } as SummaryReportData;

    private readonly uniqueUrls = new Set();

    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
        @inject(JsonSummaryReportGenerator) private readonly jsonSummaryReportGenerator: JsonSummaryReportGenerator,
        @inject(ConsoleSummaryReportGenerator) private readonly consoleSummaryReportGenerator: ConsoleSummaryReportGenerator,
        private readonly fileSystemObj: typeof fs = fs,
        private readonly lodashObj: typeof lodash = lodash,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        const spinner = new Spinner(`Running scanner...\n`);
        spinner.start();
        // tslint:disable-next-line: no-any
        const promises: any[] = [];

        try {
            const lines = this.fileSystemObj.readFileSync(scanArguments.inputFile, 'UTF-8').split(/\r?\n/);

            lines.forEach(async (line) => {
                // tslint:disable-next-line: no-parameter-reassignment
                line = line.trim();
                if (!this.lodashObj.isEmpty(line) && !this.uniqueUrls.has(line)) {
                    this.uniqueUrls.add(line);
                    promises.push(
                        this.scanURL(line).then((reportContent) => {
                            const reportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, line, 'html', reportContent);
                            this.summaryReportData.urlToReportMap[line] = reportName;
                        }),
                    );
                }
            });
        } finally {
            spinner.stop();
        }

        // tslint:disable-next-line: no-floating-promises
        Promise.all(promises).then(() => {
            console.log(this.consoleSummaryReportGenerator.generateReport(this.summaryReportData));
            const jsonSummryReportName = this.reportDiskWriter.writeToDirectory(
                scanArguments.output,
                `ViolationCountByRuleMap`,
                'json',
                this.jsonSummaryReportGenerator.generateReport(this.summaryReportData),
            );
            console.log(`ViolationCountByRuleMap summary was saved in file ${jsonSummryReportName}`);
        });
    }

    private async scanURL(url: string): Promise<string> {
        let axeResults: AxeScanResults;

        axeResults = await this.lodashObj.cloneDeep(this.scanner).scan(url);

        this.processURLScanResult(axeResults);

        return this.reportGenerator.generateReport(axeResults);
    }

    private processURLScanResult(axeResults: AxeScanResults): void {
        axeResults.results.violations?.forEach((violation) => {
            this.summaryReportData.violationCountByRuleMap[violation.id] =
                // tslint:disable-next-line: strict-boolean-expressions
                (this.summaryReportData.violationCountByRuleMap[violation.id]
                    ? this.summaryReportData.violationCountByRuleMap[violation.id]
                    : 0) + violation.nodes.length;
        });
    }
}
