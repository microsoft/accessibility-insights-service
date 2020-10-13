// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type ElementValidationState = 'pass' | 'fail' | 'other';

export interface ElementValidationResult {
    scanId: string;
    url: string;
    rule: string;
    selector: string;
    snippet: string;
    fix: string;
    state: ElementValidationState;
    timestamp: string;
}

export interface SiteValidationResult {
    baseUrl: string;
    passed: ElementValidationResult[];
    failed: ElementValidationResult[];
    other: ElementValidationResult[];
    created: Date;
    updated: Date;
}
