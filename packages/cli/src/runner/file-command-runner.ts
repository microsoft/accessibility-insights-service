// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Spinner } from 'cli-spinner';
import { inject, injectable } from 'inversify';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanArguments } from '../scanner/scan-arguments';
import { CommandRunner } from './command-runner';
import * as fs from 'fs';
import { isEmpty } from 'lodash';
import { SummaryReportData } from '../report/summary-report/summary-report-data';
import { ConsoleSummaryReportGenerator } from '../report/summary-report/console-summary-report-generator';
import { JsonSummaryReportGenerator } from '../report/summary-report/json-summary-report-generator';


@injectable()
export class FileCommandRunner implements CommandRunner {
    private summaryReportData = {
        violationCountByRuleMap: {},
        urlToReportMap: {},
    } as SummaryReportData;

    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
        @inject(JsonSummaryReportGenerator) private readonly jsonSummaryReportGenerator: JsonSummaryReportGenerator,
        @inject(ConsoleSummaryReportGenerator) private readonly consoleSummaryReportGenerator: ConsoleSummaryReportGenerator,
        private readonly fileSystemObj: typeof fs = fs,
    ) {
    }

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        const spinner = new Spinner(`Running scanner...`);
        spinner.start();
        try {
            const lines = this.fileSystemObj.readFileSync(scanArguments.inputFile, 'UTF-8').split(/\r?\n/);

            lines.forEach(async (line) => {
                line = line.trim();
                if (!isEmpty(line)) {
                    console.log('1');
                    const reportContent = await this.scanURL(line);
                    console.log('2');
                    const reportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, line, 'html', reportContent);
                    console.log(`reportName ${reportName}`);
                    this.summaryReportData.urlToReportMap[line] = reportName;
                }
            });
        } finally {
            spinner.stop();
        }

        console.log(`this.summaryReportData ${this.summaryReportData}`);
        console.log(`this.summaryReportData.urlToReportMap ${this.summaryReportData.urlToReportMap}`)
        console.log(`this.summaryReportData.violationCountByRuleMap ${this.summaryReportData.violationCountByRuleMap}`)
        console.log(this.consoleSummaryReportGenerator.generateReport(this.summaryReportData));
        const jsonSummryReportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, `ViolationCountByRuleMap_${new Date().toDateString()}`, 'json', this.jsonSummaryReportGenerator.generateReport(this.summaryReportData));
        console.log(`ViolationCountByRuleMap was saved in file ${jsonSummryReportName}`)
    }

    private async scanURL(url: string): Promise<string> {
        console.log(`Running scanner for ${url}...`);
        let axeResults: AxeScanResults;

        console.log('11');
        axeResults = await this.scanner.scan(url);

        this.processURLScanResult(axeResults);
        console.log('13');
        return this.reportGenerator.generateReport(axeResults);
    }

    private processURLScanResult(axeResults: AxeScanResults): void {
        console.log('131');
        // axeResults.results.violations?.forEach((violation) => {
        //     console.log('132');
        //     this.summaryReportData.violationCountByRuleMap[violation.id] =
        //         (this.summaryReportData.violationCountByRuleMap[violation.id] ? this.summaryReportData.violationCountByRuleMap[violation.id] : 0) + 1;
        // });
        console.log('133');
    }
}
