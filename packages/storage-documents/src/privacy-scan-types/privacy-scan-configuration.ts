// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType, StorageDocument } from '..';

// Data type stored by WCP
export interface PrivacyScanConfiguration extends StorageDocument {
    itemType: ItemType.privacyScanConfiguration;
    ScanId: string;
    Urls: string[];
    Headers: ScanConfigHeaders;
    Cookies: ScanConfigCookies;
    ConsentCookiesPerRequest: ScanConfigCookies[];
    MultiLoadTestCookies: ScanConfigCookies[];
    DurationLimitMinutes: number;
    Affinity: string;
    CookieCollectionScan: boolean;
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
