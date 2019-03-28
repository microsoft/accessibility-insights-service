import { RunState, ScanLevel } from './states';

export enum WebsiteScanState {
    completed = 'completed',
    completedWithError = 'completedWithError',
}

export interface WebsitePageScanResult {
    id: string;
    url: string;
    lastUpdated: string;
    level?: ScanLevel;
    runState: RunState;
}

/**
 * Describe website scan state.
 * The document includes the last page scan results snapshot.
 */
export interface Website {
    id: string;
    websiteId: string;
    name: string;
    baseUrl: string;
    serviceTreeId: string;
    scanResult: {
        lastUpdated: string;
        level?: ScanLevel;
        scanState: WebsiteScanState;
    };
    lastPageScans: WebsitePageScanResult[];
}
