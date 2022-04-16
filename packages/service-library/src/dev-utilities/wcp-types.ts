// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BannerValidationTypeEnum, ViolationTypeEnum } from './wcp-csharp-types';

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
    ValidationResultBlobName: string;
}
