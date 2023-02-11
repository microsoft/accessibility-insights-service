// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AuthenticationType } from './scan-result-response';

export declare type CookieBannerType = 'standard';

/**
 * Defines REST API HTTP POST scan request contract
 */
export interface ScanRunRequest {
    url: string;
    deepScan?: boolean;
    site?: Website;
    reportGroups?: ReportGroup[];
    scanNotifyUrl?: string;
    /**
     * Priority values can range from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority.
     * The default value is 0.
     */
    priority?: number;
    /**
     * Privacy scan request takes precedence over accessibility scan request
     */
    privacyScan?: PrivacyScan;
    /**
     * Resource authentication type hint
     */
    authenticationType?: AuthenticationType;
}

export interface Website {
    baseUrl: string;
    knownPages?: string[];
    discoveryPatterns?: string[];
}

export interface ReportGroup {
    consolidatedId: string;
}

export interface PrivacyScan {
    cookieBannerType: CookieBannerType;
}
