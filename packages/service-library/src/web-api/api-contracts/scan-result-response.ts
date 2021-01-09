// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanNotificationErrorCodeName } from '../scan-notification-error-codes';
import { ScanRunErrorCodeName } from '../scan-run-error-codes';
import { WebApiError } from '../web-api-error-codes';

export declare type LinkType = 'self';
export declare type ReportFormat = 'sarif' | 'html' | 'consolidated.html';
export declare type ScanState = 'pending' | 'pass' | 'fail';
export declare type RunState = 'pending' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';
export declare type NotificationState = 'pending' | 'queued' | 'queueFailed' | 'sending' | 'sent' | 'sendFailed';
export declare type NotificationErrorTypes = 'InternalError' | 'HttpErrorCode';
export declare type ScanResultResponse = ScanRunResultResponse | ScanRunErrorResponse;

/**
 * Defines REST API HTTP GET scan result contract
 */
export interface ScanRunResultResponse {
    scanId: string;
    url: string;
    scannedUrl?: string;
    scanResult?: ScanResult;
    deepScanResult?: DeepScanResultItem[];
    reports?: ScanReport[];
    run: ScanRun;
    notification?: ScanCompletedNotification;
}

export interface ScanRunErrorResponse {
    scanId: string;
    error: WebApiError;
}

export interface ScanCompletedNotification {
    scanNotifyUrl: string;
    state?: NotificationState;
    error?: NotificationError;
    responseCode?: number;
}

export interface NotificationError {
    code: ScanNotificationErrorCodeName;
    message: string;
}

export interface ScanResult {
    state: ScanState;
    issueCount?: number;
}

export interface ScanReport {
    reportId: string;
    format: ReportFormat;
    links: Links;
}

export interface Links {
    rel: LinkType;
    href: string;
}

export interface ScanRun {
    state: RunState;
    timestamp?: string;
    error?: ScanRunError;
    pageResponseCode?: number;
    pageTitle?: string;
}

export interface ScanRunError {
    code: ScanRunErrorCodeName;
    message: string;
}

export interface DeepScanResultItem {
    scanId: string;
    url: string;
    scanResultState?: ScanState;
    scanRunState: RunState;
}
