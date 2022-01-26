// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportGroup, Website } from '../scan-run-request';

export interface PrivacyScanRequest {
    url: string;
    privacyScanConfig: PrivacyScanConfig;
    priority?: number;
    reportGroups?: ReportGroup[];
    site?: Website;
}

// Data type stored by WCP
export interface PrivacyScanConfig {
    ScanId: string;
    Urls: string[];
    Headers: ScanConfigHeaders;
    Cookies: ScanConfigCookies;
    ConsentCookiesPerRequest: ScanConfigCookies[];
    MultiLoadTestCookies: ScanConfigCookies[];
    DurationLimitMinutes: number;
    // Affinity: string;
    CookieCollectionScan: boolean;
    CrawlUrlsRestrictionPath: string;
    Whitelist: WhitelistDomain[];
    BannerDetectionXPath: string;
    ConsentModalDetection: ConsentModalDetection;
}

export type ScanConfigHeaders = { [key: string]: string };

export type ScanConfigCookies = { [key: string]: string };

export interface WhitelistDomain {
    TopLevelDomain: string;
    Whitelisted: boolean;
}

export interface ConsentModalDetection {
    ManagementElementXPath: string;
    ConsentModalXPath: string;
}
