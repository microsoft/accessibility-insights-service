// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from './item-type';
import { StorageDocument } from './storage-document';
import { ScanGroupType } from './website-scan-data';
import { PrivacyScan } from './on-demand-page-scan-batch-request';

export declare type SchemaVersion = '2';
export declare type OnDemandPageScanRunState =
    | 'pending'
    | 'accepted'
    | 'queued'
    | 'running'
    | 'report'
    | 'completed'
    | 'failed'
    | 'unscannable';
export declare type ScanState = 'pending' | 'pass' | 'fail' | 'error';
export declare type AuthenticationState = 'succeeded' | 'failed' | 'unauthenticated';
export declare type CookieBannerType = 'standard';
export declare type AuthenticationType = 'undetermined' | 'entraId';
export declare type ScanType = 'privacy';
export declare type ScanDefinitionType = 'accessibility-agent';
export declare type ReportSource = 'privacy-scan';
export declare type ReportFormat = 'json' | 'consolidated.json' | 'page.mhtml' | 'page.png';

export declare type ScanErrorTypes =
    | 'AuthenticationError'
    | 'BannerXPathNotDetected'
    | 'EmptyPage'
    | 'ForeignResourceRedirection'
    | 'HttpErrorCode'
    | 'InternalError'
    | 'InvalidContentType'
    | 'InvalidUrl'
    | 'NavigationError'
    | 'ResourceLoadFailure'
    | 'ScanTimeout'
    | 'SslError'
    | 'UnsupportedResource'
    | 'UrlNavigationTimeout'
    | 'UrlNotResolved';

export interface ScanError {
    errorType: ScanErrorTypes;
    message: string;
}

/**
 * The web page scan run result document.
 */
export interface OnDemandPageScanResult extends StorageDocument {
    itemType: ItemType.onDemandPageScanRunResult;
    schemaVersion?: SchemaVersion;
    url: string;
    priority: number;
    scanType?: ScanType;
    batchRequestId?: string;
    deepScanId?: string;
    websiteScanRef?: WebsiteScanRef;
    scannedUrl?: string;
    run: OnDemandPageScanRunResult;
    scanResult?: OnDemandScanResult;
    reports?: OnDemandPageScanReport[];
    privacyScan?: PrivacyScan;
    authentication?: AuthenticationResult;
    scanDefinitions?: ScanDefinition[];
}

export interface AuthenticationResult {
    hint: AuthenticationType;
    detected?: AuthenticationType;
    state?: AuthenticationState;
}

export interface OnDemandScanResult {
    state: ScanState;
    issueCount?: number;
}

export interface OnDemandPageScanReport {
    reportId: string;
    format: ReportFormat;
    source?: ReportSource;
    href: string;
}

export interface OnDemandPageScanRunResult {
    state: OnDemandPageScanRunState;
    timestamp?: string;
    error?: string | ScanError;
    pageTitle?: string;
    pageResponseCode?: number;
    retryCount?: number;
    scanRunDetails?: ScanRunDetail[];
}

export interface ScanRunDetail {
    name: ScanDefinitionType;
    state: OnDemandPageScanRunState;
    timestamp?: string;
    error?: string | null;
    details?: unknown;
}

export interface WebsiteScanRef {
    id: string;
    scanGroupId: string;
    scanGroupType: ScanGroupType;
}

export interface ScanDefinition {
    name: ScanDefinitionType;
    args?: Record<string, string | number | boolean>;
    options?: Record<string, string | number | boolean>;
}
