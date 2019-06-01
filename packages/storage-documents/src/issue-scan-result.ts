// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ResultLevel } from './states';
import { StorageDocument } from './storage-document';

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

export interface RuleResult {
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
export interface IssueScanResult extends StorageDocument {
    result: RuleResult;
    product: Product;
}

export interface IssueScanResults {
    results?: IssueScanResult[];
    error?: string;
}
