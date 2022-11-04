// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    reason: any;
    httpStatusCode: number;
    bannerDetected?: boolean;
    bannerDetectionXpathExpression?: string;
}
