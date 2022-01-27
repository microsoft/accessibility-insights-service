// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface PrivacyPageScanReport {
    FinishDateTime: Date;
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
