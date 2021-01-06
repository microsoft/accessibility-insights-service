// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ScanArguments } from '../scan-arguments';
import { ConsolidatedReportGenerator } from '../report/consolidated-report-generator';
import { CrawlerParametersBuilder } from '../crawler-parameters-builder';
import { CommandRunner } from './command-runner';
import { AICrawler } from '../crawler/ai-crawler';

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
        const scanStarted = new Date();
        const combinedScanResult = await this.crawler.crawl(crawlerRunOptions);
        const scanEnded = new Date();
        console.log('Generating summary scan report...');
        const reportContent = await this.consolidatedReportGenerator.generateReport(combinedScanResult, scanStarted, scanEnded);
        const reportLocation = this.reportDiskWriter.writeToDirectory(scanArguments.output, 'index', 'html', reportContent);
        console.log(`Summary report was saved as ${reportLocation}`);
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
