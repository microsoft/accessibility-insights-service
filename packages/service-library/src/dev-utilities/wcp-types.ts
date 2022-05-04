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
    StartedDate: string;
    ValidationResultID: string;
    ValidationResultBlobName: string;
}
