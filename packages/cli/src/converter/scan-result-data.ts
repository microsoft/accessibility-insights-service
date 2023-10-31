// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface UrlCount {
    total: number;
    failed: number;
    passed: number;
}

export interface ScanResultData {
    baseUrl: string;
    basePageTitle: string;
    scanEngineName: string;
    axeCoreVersion: string;
    browserUserAgent: string;
    urlCount: UrlCount;
    scanStarted: Date;
    scanEnded: Date;
    browserResolution: string;
}
