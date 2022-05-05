// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export enum ViolationTypeEnum {
    NoViolation,
    CookieNotInventoried,
    NonEssentialCookieWrittenWithoutConsent,
    DualPurposeCookieWritten,
    HttpError,
    UnsupportedPurposeCategoriesOnly,
    UnsupportedExpirationLengthMsft,
    UnsupportedExpirationLengthNoMsft,
    NonEssentialCookieWithRevokedConsent,
}

export enum BannerValidationTypeEnum {
    BannerNotPresent,
    BannerPresent,
    BannerNotApplicable,
    NoBannerAndNoNonEssentialCookie,
    BannerNotRequired,
}

export interface UrlValidation {
    Url: string;
    BannerStatus: BannerValidationTypeEnum;
    IsCookieManageable: boolean;
    BannerXPath: string;
    ManageCookieXpath: string;
    IsCookieComplaint: boolean;
    HttpStatusCode: number;
    HttpStatusMessage: string;
    FiddlerTraceLink: string;
    HtmlContentLink: string;
    CookieValidations: CookieValidation[];
}

export interface CookieValidation {
    ViolationType: ViolationTypeEnum;
    ScanCookie: ScannedCookie;
    AllowedCategories: string[];
    CookieCategories: string[];
}

export interface ScannedCookie {
    Name: string;
    Domain: string;
    LifeSpan: number;
}

export interface PrivacyMetadata {
    ID: string;
    Name: string;
    ScanDate: string;
    ScanResultLink: string;
}

export interface PrivacyValidationResult {
    CookieCollectionUrlResults: CookieCollectionUrlResult[];
    FailedUrls: string[];
    FinishDateTime: Date;
    Progress: number;
    ResultScanId: number;
    ScanId: string;
    ScanTeamId: number;
    StartDateTime: Date;
    Status: string;
    Urls: string[];
    Vulnerablilities: string[];
    Whitelist: string[];
}
export interface CookieCollectionUrlResult {
    ConsentModalValidationResult: ConsentModalValidationResult;
    MultiLoadResults: MultiLoadResult[];
    NavigationalUri: string;
    SeedUri: string;
    HttpStatusCode: number;
    CookieCollectionConsentResults: CookieCollectionConsentResult[];
    BannerDetected: boolean;
    BannerDetectionXpathExpression: string;
    LinkToFiddlerTrace: string;
    LinkToHtmlContent: string;
}
export interface ConsentModalValidationResult {
    ConsentManagementElementXPath: string;
    ConsentManagementElementExists: boolean;
    ConsentModalXPath: string;
    ConsentModalAppears: boolean;
}
export interface CookieCollectionConsentResult {
    CookiesUsedForConsent: string;
    CookiesBeforeConsent: CookiesSession[];
    CookiesAfterConsent: CookiesSession[];
}
export interface MultiLoadResult {
    BaseCookie: string;
    TestedCookie: string;
    CookiesBeforeUpdate: CookiesSession[];
    CookiesAfterUpdate: CookiesSession[];
}
export interface CookiesSession {
    Domain: string;
    Cookies: Cookies[];
}
export interface Cookies {
    TimeStamp: Date;
    Secure: boolean;
    Port: string;
    Path: string;
    Name: string;
    Expires: Date;
    Expired: boolean;
    Discard: boolean;
    Value: string;
    HttpOnly: boolean;
    Comment: string;
    Domain: string;
    Version: number;
}
