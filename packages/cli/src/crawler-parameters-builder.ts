// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import fs from 'fs';
import { injectable } from 'inversify';
import { Url } from 'common';
import { CrawlerRunOptions } from 'accessibility-insights-crawler';
import { ScanArguments } from './scan-arguments';

@injectable()
export class CrawlerParametersBuilder {
    constructor(private readonly urlObj: typeof Url = Url, private readonly fileSystem: typeof fs = fs) {}

    public build(scanArguments: ScanArguments): CrawlerRunOptions {
        if (scanArguments.crawl && scanArguments.url) {
            this.validateCrawlBaseUrl(scanArguments.url);
        }

        const inputUrlSet = new Set<string>();
        if (scanArguments.inputUrls) {
            const urls = this.validateInputUrls(scanArguments.inputUrls);
            urls.forEach((url) => inputUrlSet.add(url));
        }
        if (scanArguments.inputFile) {
            const urls = this.validateInputFileContent(scanArguments.inputFile);
            urls.forEach((url) => inputUrlSet.add(url));
        }

        return {
            crawl: scanArguments.crawl,
            baseUrl: scanArguments.url,
            simulate: scanArguments.simulate,
            selectors: scanArguments.selectors,
            localOutputDir: scanArguments.output,
            maxRequestsPerCrawl: scanArguments.maxUrls,
            restartCrawl: scanArguments.restart,
            snapshot: scanArguments.snapshot,
            memoryMBytes: scanArguments.memoryMBytes,
            silentMode: scanArguments.silentMode,
            inputUrls: [...inputUrlSet],
            discoveryPatterns: scanArguments.discoveryPatterns,
            chromePath: scanArguments.chromePath,
            axeSourcePath: scanArguments.axeSourcePath,
        };
    }

    private validateCrawlBaseUrl(url: string): void {
        if (this.urlObj.hasQueryParameters(url)) {
            throw new Error(`Crawl base URL should not have any query parameters. ${url}`);
        }
    }

    private validateInputFileContent(inputFile: string): string[] {
        // eslint-disable-next-line
        if (!this.fileSystem.existsSync(inputFile)) {
            throw new Error(`Input file does not exist: ${inputFile}`);
        }

        // eslint-disable-next-line
        const inputUrls = this.fileSystem.readFileSync(inputFile, 'utf-8').split(/\r?\n/);
        const urls = this.normalizeUrls(inputUrls);
        if (urls.length === 0) {
            throw new Error(`Input file does not have any URLs.`);
        }

        return urls;
    }

    private validateInputUrls(inputUrls: string[]): string[] {
        const urls = this.normalizeUrls(inputUrls);
        if (urls.length === 0) {
            throw new Error(`Input URLs list does no have any URLs.`);
        }

        return urls;
    }

    private normalizeUrls(urls: string[]): string[] {
        const urlSet = new Set<string>();
        for (let url of urls) {
            url = url.trim();
            if (url.length > 0) {
                urlSet.add(url);
            }
        }

        return Array.from(urlSet);
    }
}
