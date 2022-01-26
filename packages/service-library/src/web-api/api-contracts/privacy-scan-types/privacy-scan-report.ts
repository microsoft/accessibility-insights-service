// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type PrivacyScanStatus = 'Completed' | 'Failed'; // Verify that these are the only options

// Data type used by WCP
export interface PrivacyScanReport {
    ScanId: string;
    // ScanTeamId: number;
    ResultScanId: number; // How is this different from ScanId?
    Status: PrivacyScanStatus;
    // Progress: number;
    Urls: string[];
    FailedUrls: FailedUrl[];
    ScanCookies: Cookie[];
    CookieCollectionUrlResults: ScannedUrl;
    StartDateTime: Date;
    FinishDateTime: Date;
}

export interface FailedUrl {
    Url: string;
    SeedUri: string;
    Reason: string; // "error=Error message"
    HttpStatusCode: number;
    BannerDetected: boolean;
    BannerDetectionXpathExpression: string;
}

export interface Cookie {
    Name: string;
    Domain: string;
    TimeStamp?: Date;
    Expires?: Date;
}

export interface CookieByDomain {
    Domain: string;
    Cookies: Cookie[];
}

export interface ConsentResult {
    CookiesUsedForConsent: string;
    CookiesBeforeConsent: CookieByDomain[];
    CookiesAfterConsent: CookieByDomain[];
}

export interface MultiLoadResult {
    BaseCookie: string;
    TestedCookie: string;
    CookiesBeforeUpdate: CookieByDomain[];
    CookiesAfterUpdate: CookieByDomain[];
}

export interface ConsentModalValidationResult {
    ConsentManagementElementXPath: string;
    ConsentManagementElementExists: boolean;
}

export interface ScannedUrl {
    NavigationalUri: string;
    SeedUrl: string;
    HttpStatusCode: number;
    Cookies: CookieByDomain[];
    CookiesBeforeConsent: CookieByDomain;
    CookiesAfterConsent: CookieByDomain;
    CookieCollectionConsentResults: ConsentResult[];
    MultiLoadResults?: MultiLoadResult[];
    BannerDetected: boolean;
    BannerDetectionXpathExpression: string;
    ConsentModalValidationResult?: ConsentModalValidationResult;
}
