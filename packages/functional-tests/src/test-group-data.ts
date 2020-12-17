// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface TestGroupData {
    testGroupName: string;
    data?: TestContextData;
}

export interface TestContextData {
    scanUrl: string;
    scanId?: string;
    reportId?: string;
    consolidatedScanId?: string;
    consolidatedReportId?: string;
}
