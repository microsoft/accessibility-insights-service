// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Cookie, PrivacyPageScanReport } from './privacy-page-scan-report';

export type PrivacyScanStatus = 'Completed' | 'Failed';

// Data type used by WCP
export interface PrivacyScanCombinedReport {
    ScanId: string;
    ScanTeamId: number;
    ResultScanId: number;
    Status: PrivacyScanStatus;
    Urls: string[];
    FailedUrls: FailedUrl[];
    ScanCookies: Cookie[];
    CookieCollectionUrlResults: PrivacyPageScanReport[];
    StartDateTime: Date;
    FinishDateTime: Date;
}

export interface FailedUrl {
    Url: string;
    SeedUri: string;
    Reason: string; // "error=Error message"
    HttpStatusCode: number;
    BannerDetected?: boolean;
    BannerDetectionXpathExpression?: string;
}
