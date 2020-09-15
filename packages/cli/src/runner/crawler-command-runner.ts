// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CrawlerEntryPoint } from 'accessibility-insights-crawler';
import { CrawlSummaryDetails } from 'accessibility-insights-report';
import { inject, injectable } from 'inversify';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ScanArguments } from '../scanner/scan-arguments';
import { CommandRunner } from './command-runner';

@injectable()
export class CrawlerCommandRunner implements CommandRunner {
    constructor(
        @inject(CrawlerEntryPoint) private readonly crawlerEntryPoint: CrawlerEntryPoint,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        const startDate = new Date();
        const startDatNumber = Date.now();

        const scanResult = await this.crawlerEntryPoint.crawl({
            baseUrl: scanArguments.url,
            simulate: scanArguments.simulate,
            selectors: scanArguments.selectors,
            localOutputDir: scanArguments.output,
            maxRequestsPerCrawl: scanArguments.maxUrls,
            restartCrawl: scanArguments.restart,
            snapshot: scanArguments.snapshot,
            memoryMBytes: scanArguments.memoryMBytes,
            silentMode: scanArguments.silentMode,
            inputFile: scanArguments.inputFile,
            existingUrls: scanArguments.existingUrls,
            discoveryPatterns: scanArguments.discoveryPatterns,
        });

        const endDate = new Date();
        const endDateNumber = Date.now();

        const crawlDetails: CrawlSummaryDetails = {
            baseUrl: scanArguments.url,
            basePageTitle: 'title',
            scanStart: startDate,
            scanComplete: endDate,
            durationSeconds: (endDateNumber - startDatNumber) / 1000,
        };

        const reportContent = await this.reportGenerator.generateSummaryReport(crawlDetails, scanResult.summaryScanResults);

        this.reportDiskWriter.writeToDirectory(scanArguments.output, scanArguments.url, 'html', reportContent);
    }
}
