// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { checkObject, checkObjectArray } from '../../type-guard';
import { AuthenticationType, authenticationTypes, BrowserValidationTypes } from './scan-result-response';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Construct to support type guard
export const cookieBannerTypes = ['standard'] as const;
export declare type CookieBannerType = (typeof cookieBannerTypes)[number];
export const scanDefinitionTypes = ['accessibility_agent'] as const;
export declare type ScanDefinitionType = (typeof scanDefinitionTypes)[number];

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
    browserValidations?: BrowserValidationTypes[];
    scanDefinitions?: ScanDefinition[];
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
export interface ScanDefinition {
    name: ScanDefinitionType;
    args?: Record<string, string | number | boolean>;
    options?: Record<string, string | number | boolean>;
}

export function isScanRunRequest(arg: any): arg is ScanRunRequest {
    return (
        checkObject(arg, {
            primitives: [
                ['url', 'string'],
                ['deepScan', 'boolean', true],
                ['scanNotifyUrl', 'string', true],
                ['priority', 'number', true],
            ],
            literals: [['authenticationType', authenticationTypes, true]],
        }) &&
        (!('site' in arg) ||
            checkObject(arg.site, {
                primitives: [['baseUrl', 'string']],
                arrays: [
                    ['knownPages', 'string', true],
                    ['discoveryPatterns', 'string', true],
                ],
            })) &&
        (!('privacyScan' in arg) ||
            checkObject(arg.privacyScan, {
                literals: [['cookieBannerType', cookieBannerTypes]],
            })) &&
        (!('reportGroups' in arg) ||
            checkObjectArray(arg.reportGroups, {
                primitives: [['consolidatedId', 'string']],
            })) &&
        (!('scanDefinitions' in arg) ||
            checkObjectArray(arg.scanDefinitions, {
                literals: [['name', scanDefinitionTypes]],
            }))
    );
}
