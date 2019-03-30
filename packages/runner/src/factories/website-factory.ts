import { inject } from 'inversify';
import { HashGenerator } from '../common/hash-generator';
import { ScanMetadata } from '../types/scan-metadata';
import { PageScanResult } from '../documents/page-scan-result';
import { RunState, ScanLevel } from '../documents/states';
import { Website, WebsitePageScanResult, WebsiteScanState } from '../documents/website';

export class WebsiteFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public createWebsiteDocumentId(baseUrl: string): string {
        // preserve parameters order for the hash compatibility
        return this.hashGenerator.getWebsiteDocumentId(baseUrl);
    }

    public update(sourceWebsite: Website, pageScanResult: PageScanResult, runTime: Date): Website {
        const websitePageId = this.hashGenerator.getWebsitePageDocumentId(sourceWebsite.baseUrl, pageScanResult.url);
        const pageScanIndex = sourceWebsite.lastPageScans.findIndex(scan => scan.pageId === websitePageId);
        const pageScanLevel = this.getPageScanLevel(pageScanResult);
        if (pageScanIndex > -1) {
            sourceWebsite.lastPageScans[pageScanIndex].lastUpdated = runTime.toJSON();
            sourceWebsite.lastPageScans[pageScanIndex].level = pageScanLevel;
            sourceWebsite.lastPageScans[pageScanIndex].runState = pageScanResult.scan.run.state;
        } else {
            const websitePageScanResult = {
                id: pageScanResult.id,
                pageId: websitePageId,
                url: pageScanResult.url,
                lastUpdated: runTime.toJSON(),
                level: pageScanLevel,
                runState: pageScanResult.scan.run.state,
            };
            sourceWebsite.lastPageScans.push(websitePageScanResult);
        }

        const scanState = this.getWebsiteScanState(sourceWebsite.lastPageScans);
        const websiteScanLevel = this.getWebsiteScanLevel(sourceWebsite.lastPageScans);
        sourceWebsite.scanResult.lastUpdated = runTime.toJSON();
        sourceWebsite.scanResult.scanState = scanState;
        sourceWebsite.scanResult.level = websiteScanLevel;

        return sourceWebsite;
    }

    public create(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Website {
        const websiteDocumentId = this.hashGenerator.getWebsiteDocumentId(scanMetadata.baseUrl);
        const websitePageId = this.hashGenerator.getWebsitePageDocumentId(scanMetadata.baseUrl, pageScanResult.url);
        const pageScanLevel = this.getPageScanLevel(pageScanResult);
        const websitePageScanResult = {
            id: pageScanResult.id,
            pageId: websitePageId,
            url: pageScanResult.url,
            lastUpdated: runTime.toJSON(),
            level: pageScanLevel,
            runState: pageScanResult.scan.run.state,
        };
        const scanState = this.getWebsiteScanState([websitePageScanResult]);

        return {
            id: websiteDocumentId,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            scanResult: {
                lastUpdated: runTime.toJSON(),
                level: pageScanLevel,
                scanState: scanState,
            },
            lastPageScans: [websitePageScanResult],
        };
    }

    private getWebsiteScanState(websitePageScanResult: WebsitePageScanResult[]): WebsiteScanState {
        return websitePageScanResult.some(result => result.runState === RunState.failed)
            ? WebsiteScanState.completedWithError
            : WebsiteScanState.completed;
    }

    private getWebsiteScanLevel(websitePageScanResult: WebsitePageScanResult[]): ScanLevel {
        return websitePageScanResult.some(result => result.level === ScanLevel.fail) ? ScanLevel.fail : ScanLevel.pass;
    }

    private getPageScanLevel(pageScanResult: PageScanResult): ScanLevel {
        return pageScanResult.scan.result !== undefined ? pageScanResult.scan.result.level : undefined;
    }
}
