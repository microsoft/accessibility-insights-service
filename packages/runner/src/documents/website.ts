import { RunState, ScanLevel } from './states';
import { StorageDocument } from './storage-document';

export enum WebsiteScanState {
    completed = 'completed',
    completedWithError = 'completedWithError',
}

export interface WebsitePageScanResult {
    id: string;
    pageId: string;
    url: string;
    lastUpdated: string;
    level?: ScanLevel;
    runState: RunState;
}

/**
 * Describes the website scan state.
 * The document includes the last page scan results snapshot.
 */
export interface Website extends StorageDocument {
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
