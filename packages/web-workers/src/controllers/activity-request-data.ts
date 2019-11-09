// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ActivityRequestData {
    activityName: string;
    data?: unknown;
}

export interface CreateScanRequestData {
    scanUrl: string;
    priority: number;
}

export interface GetScanResultData {
    scanId: string;
}

export interface GetScanReportData {
    scanId: string;
    reportId: string;
}
