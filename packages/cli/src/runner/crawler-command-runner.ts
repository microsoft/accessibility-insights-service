// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CrawlerEntryPoint, ScanResults } from 'accessibility-insights-crawler';
import { CrawlSummaryDetails } from 'accessibility-insights-report';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { ReportDiskWriter } from '../report/report-disk-writer';
import { ReportGenerator } from '../report/report-generator';
import { ReportNameGenerator } from '../report/report-name-generator';
import { ScanArguments } from '../scanner/scan-arguments';
import { CommandRunner } from './command-runner';

@injectable()
export class CrawlerCommandRunner implements CommandRunner {
    constructor(
        @inject(CrawlerEntryPoint) private readonly crawlerEntryPoint: CrawlerEntryPoint,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(ReportDiskWriter) private readonly reportDiskWriter: ReportDiskWriter,
        @inject(ReportNameGenerator) private readonly reportNameGenerator: ReportNameGenerator,
        private readonly filesystem: typeof fs = fs,
    ) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        if (this.canRun(scanArguments) !== true) {
            return;
        }

        console.log(`Crawling and scanning page ${scanArguments.url}`);

        const startDate = new Date();
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
        await this.generateSummaryReports(scanArguments, scanResult, startDate, endDate);
    }

    private async generateSummaryReports(
        scanArguments: ScanArguments,
        scanResult: ScanResults,
        startDate: Date,
        endDate: Date,
    ): Promise<void> {
        const durationSeconds = (endDate.valueOf() - startDate.valueOf()) / 1000;
        console.log(`Done in ${durationSeconds} seconds`);

        const scannedPagesCount = scanResult.summaryScanResults.failed.length + scanResult.summaryScanResults.passed.length;
        const discoveredPagesCount = scannedPagesCount + scanResult.summaryScanResults.unscannable.length;
        console.log(`Scanned ${scannedPagesCount} of ${discoveredPagesCount} pages discovered`);

        const issueCount = scanResult.summaryScanResults.failed.reduce((a, b) => a + b.numFailures, 0);
        console.log(`Found ${issueCount} accessibility issues`);

        const crawlDetails: CrawlSummaryDetails = {
            baseUrl: scanArguments.url,
            basePageTitle: scanResult.scanMetadata.basePageTitle,
            scanStart: startDate,
            scanComplete: endDate,
            durationSeconds: durationSeconds,
        };

        const reportContent = await this.reportGenerator.generateSummaryReport(
            crawlDetails,
            scanResult.summaryScanResults,
            scanResult.scanMetadata.userAgent,
        );

        const reportLocation = this.reportDiskWriter.writeToDirectory(scanArguments.output, 'index', 'html', reportContent);
        console.log(`Summary report was saved as ${reportLocation}`);

        if (scanResult.errors.length > 0) {
            const errorLogName = `${this.reportNameGenerator.generateName('ai-cli-errors', endDate)}.log`;
            const errorLogLocation = this.reportDiskWriter.writeErrorLogToDirectory(scanArguments.output, errorLogName, scanResult.errors);
            console.log(`Error log was saved as ${errorLogLocation}`);
        }
    }

    private canRun(scanArguments: ScanArguments): boolean {
        if (this.filesystem.existsSync(scanArguments.output) && !scanArguments.restart && !scanArguments.continue) {
            console.log(
                'The last scan result was found on a disk. Use --continue option to continue scan, or --restart option to delete last scan result.',
            );

            return false;
        }

        return true;
    }
}
