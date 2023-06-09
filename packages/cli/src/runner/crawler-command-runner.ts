// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import fs from 'fs';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ScanArguments } from '../scan-arguments';
import { ConsolidatedReportGenerator } from '../report/consolidated-report-generator';
import { CrawlerParametersBuilder } from '../crawler/crawler-parameters-builder';
import { AICrawler } from '../crawler/ai-crawler';
import { BaselineOptionsBuilder } from '../baseline/baseline-options-builder';
import { OutputFileWriter } from '../files/output-file-writer';
import { BaselineFileUpdater } from '../baseline/baseline-file-updater';
import { ReportNameGenerator } from '../report/report-name-generator';
import { CommandRunner } from './command-runner';

@injectable()
export class CrawlerCommandRunner implements CommandRunner {
    constructor(
        @inject(AICrawler) private readonly aiCrawler: AICrawler,
        @inject(CrawlerParametersBuilder) private readonly crawlerParametersBuilder: CrawlerParametersBuilder,
        @inject(ConsolidatedReportGenerator) private readonly consolidatedReportGenerator: ConsolidatedReportGenerator,
        @inject(OutputFileWriter) private readonly outputFileWriter: OutputFileWriter,
        @inject(BaselineOptionsBuilder) private readonly baselineOptionsBuilder: BaselineOptionsBuilder,
        @inject(BaselineFileUpdater) private readonly baselineFileUpdater: BaselineFileUpdater,
        @inject(ReportNameGenerator) private readonly reportNameGenerator: ReportNameGenerator,
        private readonly fileSystem: typeof fs = fs,
        private readonly stdoutWriter: (output: string) => void = console.log,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        if (this.canRunCommand(scanArguments) !== true) {
            return;
        }

        const crawlerRunOptions = this.crawlerParametersBuilder.build(scanArguments);
        const baselineOptions = this.baselineOptionsBuilder.build(scanArguments);

        const scanStarted = new Date();
        const combinedScanResult = await this.aiCrawler.crawl(crawlerRunOptions, baselineOptions);
        const scanEnded = new Date();

        if (!isEmpty(combinedScanResult.errors)) {
            const errorLog = this.outputFileWriter.writeToDirectory(
                scanArguments.output,
                this.reportNameGenerator.generateName('ai-cli-browser-errors', new Date()),
                'log',
                JSON.stringify(combinedScanResult.errors, undefined, 2),
            );

            this.stdoutWriter(`Web browser failed to open URL(s). Please check error log for details that was saved as ${errorLog}`);
        }

        if (combinedScanResult.urlCount.total === 0) {
            this.stdoutWriter(
                'No scan result found. If this persists, check error log(s), search for a known issue, or file a new one at https://github.com/microsoft/accessibility-insights-service/issues.',
            );

            return;
        }

        this.stdoutWriter('Generating summary scan report...');
        const reportContent = await this.consolidatedReportGenerator.generateReport(combinedScanResult, scanStarted, scanEnded);
        const reportLocation = this.outputFileWriter.writeToDirectory(scanArguments.output, 'index', 'html', reportContent);
        this.stdoutWriter(`Summary report was saved as ${reportLocation}`);

        await this.baselineFileUpdater.updateBaseline(scanArguments, combinedScanResult.baselineEvaluation);
    }

    private canRunCommand(scanArguments: ScanArguments): boolean {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (this.fileSystem.existsSync(scanArguments.output) && !scanArguments.restart && !scanArguments.continue) {
            this.stdoutWriter(
                'The last scan result was found on a disk. Use --continue option to continue scan for the last URL provided, or --restart option to delete the last scan result.',
            );

            return false;
        }

        return true;
    }
}
