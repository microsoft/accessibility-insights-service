// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface PrivacyPageScanReport {
    FinishDateTime: Date;
    NavigationalUri: string;
    SeedUri: string;
    HttpStatusCode: number;
    CookieCollectionConsentResults: ConsentResult[];
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
    CookiesUsedForConsent?: string;
    CookiesBeforeConsent?: CookieByDomain[];
    CookiesAfterConsent?: CookieByDomain[];
    Error?: unknown;
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
