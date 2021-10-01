// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { ScanArguments } from '../scan-arguments';
import { ConsolidatedReportGenerator } from '../report/consolidated-report-generator';
import { CrawlerParametersBuilder } from '../crawler/crawler-parameters-builder';
import { AICrawler } from '../crawler/ai-crawler';
import { BaselineOptionsBuilder } from '../baseline/baseline-options-builder';
import { OutputFileWriter } from '../files/output-file-writer';
import { BaselineFileUpdater } from '../baseline/baseline-file-updater';
import { CommandRunner } from './command-runner';

@injectable()
export class CrawlerCommandRunner implements CommandRunner {
    constructor(
        @inject(AICrawler) private readonly crawler: AICrawler,
        @inject(CrawlerParametersBuilder) private readonly crawlerParametersBuilder: CrawlerParametersBuilder,
        @inject(ConsolidatedReportGenerator) private readonly consolidatedReportGenerator: ConsolidatedReportGenerator,
        @inject(OutputFileWriter) private readonly outputFileWriter: OutputFileWriter,
        @inject(BaselineOptionsBuilder) private readonly baselineOptionsBuilder: BaselineOptionsBuilder,
        @inject(BaselineFileUpdater) private readonly baselineFileUpdater: BaselineFileUpdater,
        private readonly filesystem: typeof fs = fs,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        if (this.canRunCommand(scanArguments) !== true) {
            return;
        }

        const crawlerRunOptions = await this.crawlerParametersBuilder.build(scanArguments);
        const baselineOptions = await this.baselineOptionsBuilder.build(scanArguments);

        const scanStarted = new Date();
        const combinedScanResult = await this.crawler.crawl(crawlerRunOptions, baselineOptions);
        const scanEnded = new Date();

        console.log('Generating summary scan report...');
        const reportContent = await this.consolidatedReportGenerator.generateReport(combinedScanResult, scanStarted, scanEnded);
        const reportLocation = this.outputFileWriter.writeToDirectory(scanArguments.output, 'index', 'html', reportContent);
        console.log(`Summary report was saved as ${reportLocation}`);

        await this.baselineFileUpdater.updateBaseline(scanArguments, combinedScanResult.baselineEvaluation);
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
