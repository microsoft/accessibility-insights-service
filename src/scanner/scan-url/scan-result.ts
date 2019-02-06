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

export interface ScanResult {
    id: string;
    result: Result;
}
