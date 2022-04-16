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
