import { inject } from 'inversify';
import { HashGenerator } from '../common/hash-generator';
import { ScanMetadata } from '../common/scan-metadata';
import { PageScanResult } from '../documents/page-scan-result';
import { RunState, ScanLevel } from '../documents/states';
import { Website, WebsitePageScanResult, WebsiteScanState } from '../documents/website';

export class WebsiteFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public update(website: Website, pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Website {
        const scanIndex = website.lastPageScans.findIndex(scan => scan.id === pageScanResult.id);
        const pageScanLevel = this.getPageScanLevel(pageScanResult);
        if (scanIndex > -1) {
            website.lastPageScans[scanIndex].lastUpdated = runTime.toJSON();
            website.lastPageScans[scanIndex].level = pageScanLevel;
            website.lastPageScans[scanIndex].runState = pageScanResult.scan.run.state;
        }

        const scanState = this.getWebsiteScanState(website.lastPageScans);
        const websiteScanLevel = this.getWebsiteScanLevel(website.lastPageScans);
        website.scanResult.lastUpdated = runTime.toJSON();
        website.scanResult.scanState = scanState;
        website.scanResult.level = websiteScanLevel;

        return website;
    }

    public create(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Website {
        // preserve parameters order for the hash compatibility
        const id = this.hashGenerator.generateBase64Hash(scanMetadata.baseUrl);
        const scanLevel = this.getPageScanLevel(pageScanResult);
        const websitePageScanResult = {
            id: pageScanResult.id,
            url: pageScanResult.url,
            lastUpdated: runTime.toJSON(),
            level: scanLevel,
            runState: pageScanResult.scan.run.state,
        };
        const scanState = this.getWebsiteScanState([websitePageScanResult]);

        return {
            id: id,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            scanResult: {
                lastUpdated: runTime.toJSON(),
                level: scanLevel,
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
