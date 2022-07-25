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
    /**
     * Same as `seedUri` property
     */
    url: string;
    seedUri: string;
    navigationalUri: string;
    /**
     * Format: "error=message"
     */
    reason: string;
    httpStatusCode: number;
    bannerDetected?: boolean;
    bannerDetectionXpathExpression?: string;
}
