// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from './item-type';
import { StorageDocument } from './storage-document';
import { ScanGroupType } from './website-scan-result';
import { PrivacyScan } from './on-demand-page-scan-batch-request';
import { ReportScanRunResult } from './report-generator-request';

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
export declare type NotificationState = 'pending' | 'queued' | 'queueFailed' | 'sending' | 'sent' | 'sendFailed';
export declare type NotificationErrorTypes = 'InternalError' | 'HttpErrorCode';
export declare type AuthenticationState = 'succeeded' | 'failed' | 'unauthenticated';
export declare type CookieBannerType = 'standard';
export declare type AuthenticationType = 'undetermined' | 'entraId';

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
    | 'UrlNavigationTimeout'
    | 'SslError'
    | 'ResourceLoadFailure'
    | 'InvalidUrl'
    | 'EmptyPage'
    | 'HttpErrorCode'
    | 'NavigationError'
    | 'InvalidContentType'
    | 'UrlNotResolved'
    | 'ScanTimeout'
    | 'InternalError'
    | 'BannerXPathNotDetected'
    | 'AuthenticationError';

export interface ScanError {
    errorType: ScanErrorTypes;
    message: string;
}

/**
 * The web page scan run result document.
 */
export interface OnDemandPageScanResult extends StorageDocument {
    itemType: ItemType.onDemandPageScanRunResult;
    url: string;
    priority: number;
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
    href: string;
}

export interface OnDemandPageScanRunResult {
    state: OnDemandPageScanRunState;
    timestamp?: string;
    error?: string | ScanError;
    pageTitle?: string;
    pageResponseCode?: number;
    retryCount?: number;
}

export interface WebsiteScanRef {
    id: string;
    scanGroupId: string;
    scanGroupType: ScanGroupType;
}

export interface WorkflowRunResults {
    report: ReportScanRunResult;
}
