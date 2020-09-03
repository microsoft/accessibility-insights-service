// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CrawlerEntryPoint, setupCrawlerContainer } from 'accessibility-insights-crawler';
import { injectable } from 'inversify';
import { ScanArguments } from '../scanner/scan-arguments';
import { CommandRunner } from './command-runner';

@injectable()
export class CrawlerCommandRunner implements CommandRunner {
    constructor(private readonly crawlerEntryPoint: CrawlerEntryPoint = new CrawlerEntryPoint(setupCrawlerContainer())) {}

    public async runCommand(scanArguments: ScanArguments): Promise<void> {
        await this.crawlerEntryPoint.crawl({
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
    }
}
