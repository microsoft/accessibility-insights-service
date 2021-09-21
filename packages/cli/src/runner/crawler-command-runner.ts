// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ScanArguments } from '../scan-arguments';
import { ConsolidatedReportGenerator } from '../report/consolidated-report-generator';
import { CrawlerParametersBuilder } from '../crawler/crawler-parameters-builder';
import { AICrawler } from '../crawler/ai-crawler';
import { BaselineApplier } from '../baseline/baseline-applier';
import { CommandRunner } from './command-runner';

@injectable()
export class CrawlerCommandRunner implements CommandRunner {
    constructor(
        @inject(AICrawler) private readonly crawler: AICrawler,
        @inject(CrawlerParametersBuilder) private readonly crawlerParametersBuilder: CrawlerParametersBuilder,
        @inject(ConsolidatedReportGenerator) private readonly consolidatedReportGenerator: ConsolidatedReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
        private readonly filesystem: typeof fs = fs,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        if (this.canRunCommand(scanArguments) !== true) {
            return;
        }

        const crawlerRunOptions = await this.crawlerParametersBuilder.build(scanArguments);
        const baseline = await this.readBaseline(scanArguments);

        const scanStarted = new Date();
        const combinedScanResult = await this.crawler.crawl(crawlerRunOptions, baseline);
        const scanEnded = new Date();

        console.log('Generating summary scan report...');
        const reportContent = await this.consolidatedReportGenerator.generateReport(combinedScanResult, scanStarted, scanEnded);
        const reportLocation = this.reportDiskWriter.writeToDirectory(scanArguments.output, 'index', 'html', reportContent);
        console.log(`Summary report was saved as ${reportLocation}`);

        await this.updateBaseline(scanArguments, console.log, combinedScanResult.baselineDiff);
    }

    private async readBaseline(scanArguments: ScanArguments): Promise<BaselineFormat> {
        if (scanArguments.baselineFile == null) { return {}; }

        return await this.baselineDiskReader.readFromFile(scanArguments.baselineFile);
    }

    private async updateBaseline(scanArguments: ScanArguments, outputLogger: typeof console.log, baselineDiff?: BaselineDiff): Promise<void> {
        if (!baselineDiff?.updateRequired) {
            return;
        }
        
        const { newBaselineContent } = baselineDiff;
        outputLogger(baselineDiff.summaryMessage);

        if (scanArguments.updateBaseline) {
            outputLogger(`Updating baseline file ${scanArguments.baselineFile}...`);
            await this.baselineDiskWriter.writeToFile(scanArguments.baselineFile, newBaselineContent);
        } else {
            const updatedBaselineLocation = await this.baselineDiskWriter.writeToDirectory(
                scanArguments.output, scanArguments.baselineFile, newBaselineContent);

            outputLogger(`Updated baseline file was saved as ${updatedBaselineLocation}`);
            outputLogger(`To update the baseline with these changes, either rerun with --updateBaseline or copy the updated baseline file to ${scanArguments.baselineFile}`);
        }
    }

    private canRunCommand(scanArguments: ScanArguments): boolean {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (this.filesystem.existsSync(scanArguments.output) && !scanArguments.restart && !scanArguments.continue) {
            console.log(
                'The last scan result was found on a disk. Use --continue option to continue scan for the last URL provided, or --restart option to delete the last scan result.',
            );

            return false;
        }

        return true;
    }
}
