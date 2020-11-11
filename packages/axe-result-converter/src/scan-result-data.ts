// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ScanResultData {
    baseUrl: string;
    basePageTitle: string;
    scanEngineName: string;
    axeCoreVersion: string;
    browserUserAgent: string;
    scanStarted: Date;
    scanEnded: Date;
}
