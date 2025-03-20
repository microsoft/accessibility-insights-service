// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from './item-type';
import { StorageDocument } from './storage-document';
import { ScanGroupType } from './website-scan-result';
import { PrivacyScan } from './on-demand-page-scan-batch-request';
import { ReportScanRunResult } from './report-generator-request';

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
export declare type ScanState = 'pending' | 'pass' | 'fail';
export declare type ScanStateExt = ScanState | 'error' | 'completed';
export declare type NotificationState = 'pending' | 'queued' | 'queueFailed' | 'sending' | 'sent' | 'sendFailed';
export declare type NotificationErrorTypes = 'InternalError' | 'HttpErrorCode';
export declare type AuthenticationState = 'succeeded' | 'failed' | 'unauthenticated';
export declare type CookieBannerType = 'standard';
export declare type AuthenticationType = 'undetermined' | 'entraId';
export declare type ScanType = 'accessibility' | 'privacy';
export declare type ScanDefinitionType = 'accessibility_agent';
export declare type ReportSource = 'accessibility-agent' | 'accessibility-scan' | 'privacy-scan';
export declare type ReportFormat =
    | 'axe'
    | 'sarif'
    | 'html'
    | 'consolidated.html'
    | 'json'
    | 'consolidated.json'
    | 'page.mhtml'
    | 'page.png';

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

export declare type BrowserValidationTypes = 'highContrastProperties';

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
    subRuns?: WorkflowRunResults;
    scanResult?: OnDemandScanResult;
    reports?: OnDemandPageScanReport[];
    notification?: ScanCompletedNotification;
    privacyScan?: PrivacyScan;
    authentication?: AuthenticationResult;
    browserValidationResult?: BrowserValidationResult;
    scanDefinitions?: ScanDefinition[];
}

export interface BrowserValidationResult {
    highContrastProperties?: ScanStateExt;
}

export interface AuthenticationResult {
    hint: AuthenticationType;
    detected?: AuthenticationType;
    state?: AuthenticationState;
}

export interface ScanCompletedNotification {
    scanNotifyUrl: string;
    state?: NotificationState;
    error?: NotificationError;
    responseCode?: number;
}

export interface NotificationError {
    errorType: NotificationErrorTypes;
    message: string;
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
    state: ScanStateExt;
    timestamp?: string;
    error?: string;
    details?: unknown;
}

export interface WebsiteScanRef {
    id: string;
    scanGroupId: string;
    scanGroupType: ScanGroupType;
}

export interface WorkflowRunResults {
    report: ReportScanRunResult;
}

export interface ScanDefinition {
    name: ScanDefinitionType;
    args?: Record<string, string | number | boolean>;
    options?: Record<string, string | number | boolean>;
}
