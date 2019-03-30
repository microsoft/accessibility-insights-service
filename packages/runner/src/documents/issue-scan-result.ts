import { StorageDocument } from './storage-document';

export enum ResultLevel {
    error = 'error',
    pass = 'pass',
}

export interface PhysicalLocation {
    fileLocation: {
        uri: string;
    };
    region: {
        snippet: {
            text: string;
        };
    };
}

export interface Location {
    physicalLocation: PhysicalLocation;
    fullyQualifiedLogicalName: string;
}

export interface Result {
    ruleId: string;
    level: ResultLevel;
    locations: Location[];
}

export interface Product {
    id: string;
    name: string;
    baseUrl: string;
    serviceTreeId: string;
}

/**
 * Descries the accessibility scan issue.
 */
export interface ScanResult extends StorageDocument {
    result: Result;
    product: Product;
}

export interface IssueScanResults {
    results?: ScanResult[];
    error?: string;
}
