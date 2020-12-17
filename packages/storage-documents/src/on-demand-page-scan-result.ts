// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ItemType } from './item-type';
import { StorageDocument } from './storage-document';
import { ScanGroupType } from './website-scan-result';

export declare type ReportFormat = 'sarif' | 'html' | 'consolidated.html';
export declare type ScanState = 'pending' | 'pass' | 'fail';
export declare type OnDemandPageScanRunState = 'pending' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';
export declare type NotificationState = 'pending' | 'queued' | 'queueFailed' | 'sending' | 'sent' | 'sendFailed';

export type ScanErrorTypes =
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
    | 'InternalError';

export interface ScanError {
    errorType: ScanErrorTypes;
    message: string;
}

export type NotificationErrorTypes = 'InternalError' | 'HttpErrorCode';

/**
 * The web page scan run result document.
 */
export interface OnDemandPageScanResult extends StorageDocument {
    itemType: ItemType.onDemandPageScanRunResult;
    batchRequestId?: string;
    url: string;
    websiteScanRefs?: WebsiteScanRef[];
    priority: number;
    scannedUrl?: string;
    scanResult?: OnDemandScanResult;
    reports?: OnDemandPageScanReport[];
    run: OnDemandPageScanRunResult;
    scanNotifyUrl?: string;
    notification?: ScanCompletedNotification;
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
}

export interface WebsiteScanRef {
    id: string;
    scanGroupType: ScanGroupType;
}
