export enum ProductType {
    web = 'web',
}

export enum SourceName {
    accessibility = 'accessibility',
}

export enum ResultLevel {
    error = 'error',
    pass = 'pass',
}

export interface Tool {
    name: string;
    fullName: string;
    version: string;
    semanticVersion: string;
}

export interface Product {
    type: ProductType;
    id: string;
    serviceTreeId: string;
    name: string;
    baseUrl: string;
    version: string;
}

export interface ScanInfo {
    totalResultCount: number;
    passedResultCount: number;
    failedResultCount: number;
}

export interface Run {
    version: string;
    product: Product;
    scanInfo: ScanInfo;
    source: {
        name: SourceName;
    };
    pipeline: {
        name: string;
    };
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
    fingerprints: {
        'value0/v1': string;
    };
}

export interface ScanResult {
    id: string;
    lastUpdated: string;
    productId: string;
    tool: Tool;
    run: Run;
    result: Result;
}
