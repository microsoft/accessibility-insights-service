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
import { cloneDeep, isEmpty } from 'lodash';
import { SummaryReportData } from '../report/summary-report/summary-report-data';
import { ConsoleSummaryReportGenerator } from '../report/summary-report/console-summary-report-generator';
import { JsonSummaryReportGenerator } from '../report/summary-report/json-summary-report-generator';


@injectable()
export class FileCommandRunner implements CommandRunner {
    private summaryReportData = {
        violationCountByRuleMap: {},
        urlToReportMap: {},
    } as SummaryReportData;

    private uniqueUrls = new Set()

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
        const spinner = new Spinner(`Running scanner...\n`);
        spinner.start();
        const promises: any[] = [];

        try {
            const lines = this.fileSystemObj.readFileSync(scanArguments.inputFile, 'UTF-8').split(/\r?\n/);

            lines.forEach(async (line) => {
                line = line.trim();
                if (!isEmpty(line) && !this.uniqueUrls.has(line)) {
                    this.uniqueUrls.add(line);
                    promises.push(this.scanURL(line).then((reportContent)=>{
                        const reportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, line, 'html', reportContent);
                        this.summaryReportData.urlToReportMap[line] = reportName;
                    }));
                }
            });
        } finally {
            spinner.stop();
        }

        Promise.all(promises).then(()=>{
            console.log(this.consoleSummaryReportGenerator.generateReport(this.summaryReportData));
            const jsonSummryReportName = this.reportDiskWriter.writeToDirectory(scanArguments.output, `ViolationCountByRuleMap`, 'json', this.jsonSummaryReportGenerator.generateReport(this.summaryReportData));
            console.log(`ViolationCountByRuleMap summary was saved in file ${jsonSummryReportName}`)
        });
        
    }

    private async scanURL(url: string): Promise<string> {
        let axeResults: AxeScanResults;

        axeResults = await cloneDeep(this.scanner).scan(url);

        this.processURLScanResult(axeResults);
        return this.reportGenerator.generateReport(axeResults);
    }

    private processURLScanResult(axeResults: AxeScanResults): void {
        axeResults?.results?.violations?.forEach((violation) => {
            this.summaryReportData.violationCountByRuleMap[violation.id] =
                (this.summaryReportData.violationCountByRuleMap[violation.id] ? this.summaryReportData.violationCountByRuleMap[violation.id] : 0) + 1;
        });
    }
}
