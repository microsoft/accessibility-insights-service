import { inject } from 'inversify';
import { ScanMetadata } from '../common-types/scan-metadata';
import { HashGenerator } from '../common/hash-generator';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { WebsitePage } from '../storage-documents/website-page';

export class LinkResultConverter {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public convert(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata, runTime: Date): WebsitePage[] {
        const websitePages = new Map<string, WebsitePage>();
        crawlerScanResults.results.map(result => {
            result.links.map(link => {
                // preserve parameters order for the hash compatibility
                const id = this.hashGenerator.generateBase64Hash(scanMetadata.baseUrl, link);
                const websitePage = {
                    id: id,
                    page: {
                        websiteId: scanMetadata.websiteId,
                        url: link,
                        lastSeen: runTime.toJSON(),
                    },
                };

                websitePages.set(id, websitePage);
            });
        });

        return Array.from(websitePages.values());
    }
}
