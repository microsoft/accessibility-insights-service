// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from '.';
import { ItemType } from './item-type';

export declare type ReportFormat = 'sarif' | 'html';
export declare type ScanState = 'pending' | 'pass' | 'fail';
export declare type OnDemandPageScanRunState = 'pending' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';
export declare type NotificationState = 'queued' | 'queueFailed' | 'sent' | 'sendFailed';

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
    | 'ScanTimeout';

export interface ScanError {
    errorType: ScanErrorTypes;
    message: string;
}

/**
 * The web page scan run result document.
 */
export interface OnDemandPageScanResult extends StorageDocument {
    url: string;
    scannedUrl?: string;
    scanResult?: OnDemandScanResult;
    reports?: OnDemandPageScanReport[];
    run: OnDemandPageScanRunResult;
    priority: number;
    itemType: ItemType.onDemandPageScanRunResult;
    batchRequestId: string;
    notification?: ScanCompletedNotification;
}

export interface ScanCompletedNotification {
    state: NotificationState;
    notificationUrl: string;
    error: NotificationError;
}

export interface NotificationError {
    errorCode: number;
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
