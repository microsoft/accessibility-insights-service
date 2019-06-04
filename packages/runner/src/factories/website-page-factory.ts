// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { HashGenerator } from 'axis-storage';
import { inject, injectable } from 'inversify';
import { ItemType, RunState, WebsitePage } from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class WebsitePageFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public create(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata, runTime: Date): WebsitePage[] {
        const websitePages = new Map<string, WebsitePage>();
        crawlerScanResults.results.map(result => {
            result.links.map(link => {
                // preserve parameters order for the hash compatibility
                const id = this.hashGenerator.getWebsitePageDocumentId(scanMetadata.baseUrl, link);
                const websitePage = {
                    id: id,
                    itemType: ItemType.page,
                    page: {
                        websiteId: scanMetadata.websiteId,
                        url: link,
                        referenceIndex: 0,
                        lastSeen: runTime.toJSON(),
                        lastRunState: {
                            lastUpdated: runTime.toJSON(),
                            state: RunState.completed,
                        },
                    },
                    partitionKey: scanMetadata.websiteId,
                };

                websitePages.set(id, websitePage);
            });
        });

        return Array.from(websitePages.values());
    }
}
