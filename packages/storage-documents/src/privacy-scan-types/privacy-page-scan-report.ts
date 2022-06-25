// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PrivacyPageScanReport {
    finishDateTime: Date;
    navigationalUri: string;
    seedUri: string;
    httpStatusCode: number;
    cookieCollectionConsentResults: ConsentResult[];
    bannerDetected: boolean;
    bannerDetectionXpathExpression: string;
}

export interface Cookie {
    name: string;
    domain: string;
    timeStamp?: Date;
    expires?: Date;
}

export interface CookieByDomain {
    domain: string;
    cookies: Cookie[];
}

export interface ConsentResult {
    cookiesUsedForConsent?: string;
    cookiesBeforeConsent?: CookieByDomain[];
    cookiesAfterConsent?: CookieByDomain[];
    error?: any;
}
