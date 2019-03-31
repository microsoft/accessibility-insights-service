import { inject } from 'inversify';
import { HashGenerator } from '../common/hash-generator';
import { ScanMetadata } from '../types/scan-metadata';
import { PageScanResult } from '../documents/page-scan-result';
import { RunState, ScanLevel } from '../documents/states';
import { Website, Page, WebsiteScanState } from '../documents/website';

export class WebsiteFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public createWebsiteDocumentId(baseUrl: string): string {
        // preserve parameters order for the hash compatibility
        return this.hashGenerator.getWebsiteDocumentId(baseUrl);
    }

    public update(sourceWebsite: Website, pageScanResult: PageScanResult, runTime: Date): Website {
        const websitePageId = this.hashGenerator.getWebsitePageDocumentId(sourceWebsite.baseUrl, pageScanResult.url);
        const pageScanIndex = sourceWebsite.lastPageScanResults.findIndex(scan => scan.pageId === websitePageId);
        const pageScanLevel = this.getPageScanLevel(pageScanResult);
        if (pageScanIndex > -1) {
            sourceWebsite.lastPageScanResults[pageScanIndex].lastUpdated = runTime.toJSON();
            sourceWebsite.lastPageScanResults[pageScanIndex].level = pageScanLevel;
            sourceWebsite.lastPageScanResults[pageScanIndex].runState = pageScanResult.scan.run.state;
        } else {
            const lastPageScanResult = {
                id: pageScanResult.id,
                pageId: websitePageId,
                url: pageScanResult.url,
                lastUpdated: runTime.toJSON(),
                level: pageScanLevel,
                runState: pageScanResult.scan.run.state,
            };
            sourceWebsite.lastPageScanResults.push(lastPageScanResult);
        }

        const scanState = this.getWebsiteScanState(sourceWebsite.lastPageScanResults);
        const websiteScanLevel = this.getWebsiteScanLevel(sourceWebsite.lastPageScanResults);
        sourceWebsite.lastScanResult.lastUpdated = runTime.toJSON();
        sourceWebsite.lastScanResult.scanState = scanState;
        sourceWebsite.lastScanResult.level = websiteScanLevel;

        return sourceWebsite;
    }

    public create(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Website {
        const websiteDocumentId = this.hashGenerator.getWebsiteDocumentId(scanMetadata.baseUrl);
        const websitePageId = this.hashGenerator.getWebsitePageDocumentId(scanMetadata.baseUrl, pageScanResult.url);
        const pageScanLevel = this.getPageScanLevel(pageScanResult);
        const lastPageScanResult = {
            id: pageScanResult.id,
            pageId: websitePageId,
            url: pageScanResult.url,
            lastUpdated: runTime.toJSON(),
            level: pageScanLevel,
            runState: pageScanResult.scan.run.state,
        };
        const scanState = this.getWebsiteScanState([lastPageScanResult]);

        return {
            id: websiteDocumentId,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            lastScanResult: {
                lastUpdated: runTime.toJSON(),
                level: pageScanLevel,
                scanState: scanState,
            },
            lastPageScanResults: [lastPageScanResult],
        };
    }

    private getWebsiteScanState(websitePageScanResult: Page[]): WebsiteScanState {
        return websitePageScanResult.some(result => result.runState === RunState.failed)
            ? WebsiteScanState.completedWithError
            : WebsiteScanState.completed;
    }

    private getWebsiteScanLevel(websitePageScanResult: Page[]): ScanLevel {
        return websitePageScanResult.some(result => result.level === ScanLevel.fail) ? ScanLevel.fail : ScanLevel.pass;
    }

    private getPageScanLevel(pageScanResult: PageScanResult): ScanLevel {
        return pageScanResult.scan.result !== undefined ? pageScanResult.scan.result.level : undefined;
    }
}
