// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { HashGenerator } from 'axis-storage';
import { inject, injectable } from 'inversify';
import { ItemType, RunResult, WebsitePage } from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class WebsitePageFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    /**
     * Creates page document instance with immutable properties defined.
     *
     * @param websiteId The website ID
     * @param baseUrl The website base URL
     * @param scanUrl The page URL
     */
    public createImmutableInstance(websiteId: string, baseUrl: string, scanUrl: string): WebsitePage {
        const id = this.getPageDocumentId(baseUrl, scanUrl);

        // NOTE: Any property value defined below will override its corresponding storage document property value.
        // Properties below are considered to be immutable for the document instance.
        return {
            id: id,
            itemType: ItemType.page,
            websiteId: websiteId,
            baseUrl: baseUrl,
            url: scanUrl,
            pageRank: <number>undefined,
            backlinkLastSeen: <string>undefined,
            lastRun: <RunResult>undefined,
            partitionKey: websiteId,
        };
    }

    public createFromLinks(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata, runTime: Date): WebsitePage[] {
        const websitePages = new Map<string, WebsitePage>();
        crawlerScanResults.results.map(result => {
            result.links.map(link => {
                const websitePage = this.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, link);
                websitePage.backlinkLastSeen = runTime.toJSON();
                websitePages.set(websitePage.id, websitePage);
            });
        });

        return Array.from(websitePages.values());
    }

    private getPageDocumentId(baseUrl: string, link: string): string {
        // preserve parameters order for the hash compatibility
        return this.hashGenerator.getWebsitePageDocumentId(baseUrl, link);
    }
}
