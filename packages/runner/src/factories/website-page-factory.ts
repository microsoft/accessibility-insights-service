// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { PageObjectFactory } from 'service-library';
import { WebsitePage } from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class WebsitePageFactory {
    public constructor(@inject(PageObjectFactory) private readonly pageObjectFactory: PageObjectFactory) {}

    public createFromLinks(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata, runTime: Date): WebsitePage[] {
        const websitePages = new Map<string, WebsitePage>();
        crawlerScanResults.results.map(result => {
            result.links.map(link => {
                const websitePage = this.pageObjectFactory.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, link);
                websitePage.lastReferenceSeen = runTime.toJSON();
                websitePages.set(websitePage.id, websitePage);
            });
        });

        return Array.from(websitePages.values());
    }
}
