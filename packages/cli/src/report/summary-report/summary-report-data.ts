// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ViolationCountMap {
    [key: string]: number;
}

export interface UrlToReportMap {
    [key: string]: string;
}

export interface SummaryReportData {
    violationCountByRuleMap: ViolationCountMap;
    failedUrlToReportMap: UrlToReportMap;
    passedUrlToReportMap: UrlToReportMap;
    unScannableUrls: string[];
}
