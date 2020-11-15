// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import fs from 'fs';
import { injectable } from 'inversify';
import { Url } from 'common';
import { CrawlerRunOptions } from 'accessibility-insights-crawler';
import { ScanArguments } from './scanner/scan-arguments';

@injectable()
export class CrawlerParametersBuilder {
    constructor(private readonly urlObj: typeof Url = Url, private readonly filesystem: typeof fs = fs) {}

    public async build(scanArguments: ScanArguments): Promise<CrawlerRunOptions> {
        if (scanArguments.crawl && scanArguments.url) {
            this.validateCrawlBaseUrl(scanArguments.url);
        }

        const inputUrlSet = new Set<string>();
        if (scanArguments.inputUrls) {
            const urls = this.validateInputUrls(scanArguments.inputUrls);
            urls.map(inputUrlSet.add);
        }
        if (scanArguments.inputFile) {
            const urls = await this.validateInputFileContent(scanArguments.inputFile);
            urls.map(inputUrlSet.add);
        }

        // const baseUrl = scanArguments.url ?? inputUrlSet[0];
        // if (scanArguments.url) {
        //     return scanArguments;
        // }

        return { ...scanArguments, baseUrl: '', inputUrls: [...inputUrlSet] };
    }

    private validateCrawlBaseUrl(url: string): void {
        if (this.urlObj.hasQueryParameters(url)) {
            throw new Error(`Crawl base URL should not have any query parameters. ${url}`);
        }
    }

    private async validateInputFileContent(inputFile: string): Promise<string[]> {
        /* eslint-disable-next-line */
        if (!this.filesystem.existsSync(inputFile)) {
            throw new Error(`Input file does not exist: ${inputFile}`);
        }

        /* eslint-disable-next-line */
        const inputUrls = await this.filesystem.readFileSync(inputFile, 'utf-8').split(/\r?\n/);
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
