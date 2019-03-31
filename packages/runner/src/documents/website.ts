import { RunState, ScanLevel } from './states';
import { StorageDocument } from './storage-document';

export enum WebsiteScanState {
    completed = 'completed',
    completedWithError = 'completedWithError',
}

/**
 * Describes the website page last scan result.
 */
export interface Page {
    id: string;
    pageId: string;
    url: string;
    lastUpdated: string;
    level?: ScanLevel;
    runState: RunState;
}

/**
 * Describes the website last scan state.
 */
export interface Website extends StorageDocument {
    websiteId: string;
    name: string;
    baseUrl: string;
    serviceTreeId: string;
    lastScanResult: {
        lastUpdated: string;
        level?: ScanLevel;
        scanState: WebsiteScanState;
    };
    lastPageScanResults: Page[];
}
