// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Cookie, PrivacyPageScanReport } from './privacy-page-scan-report';

export type PrivacyScanStatus = 'Completed' | 'Failed';

// Data type used by WCP
export interface PrivacyScanCombinedReport {
    scanId: string;
    status: PrivacyScanStatus;
    urls: string[];
    failedUrls: FailedUrl[];
    scanCookies: Cookie[];
    cookieCollectionUrlResults: PrivacyPageScanReport[];
    startDateTime: Date;
    finishDateTime: Date;
}

export interface FailedUrl {
    url: string;
    seedUri: string;
    reason: string; // "error=Error message"
    httpStatusCode: number;
    bannerDetected?: boolean;
    bannerDetectionXpathExpression?: string;
}
