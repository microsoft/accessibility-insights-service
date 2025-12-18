// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanNotificationErrorCodeName } from '../scan-notification-error-codes';
import { ScanRunErrorCodeName } from '../scan-run-error-codes';
import { WebApiError } from '../web-api-error-codes';
import { ScanDefinitionType } from './scan-run-request';

export declare type LinkType = 'self';
export declare type ScanState = 'pending' | 'pass' | 'fail' | 'error';
export declare type RunState =
    | 'pending'
    | 'accepted'
    | 'queued'
    | 'running'
    | 'retrying'
    | 'report'
    | 'completed'
    | 'failed'
    | 'unscannable';
export declare type NotificationState = 'pending' | 'queued' | 'queueFailed' | 'sending' | 'sent' | 'sendFailed';
export declare type NotificationErrorTypes = 'InternalError' | 'HttpErrorCode';
export declare type ScanType = 'accessibility' | 'privacy';
export declare type ScanResultResponse = ScanRunResultResponse | ScanRunErrorResponse;
export declare type AuthenticationState = 'succeeded' | 'failed' | 'unauthenticated';

// Construct to support type guard
export const authenticationTypes = ['undetermined', 'entraId', 'bearerToken'] as const;
export declare type AuthenticationType = (typeof authenticationTypes)[number];

// Construct to support type guard
export const browserValidationTypes = ['highContrastProperties'] as const;
export declare type BrowserValidationTypes = (typeof browserValidationTypes)[number];
export declare type ReportSource = 'accessibility-agent' | 'accessibility-scan' | 'accessibility-combined' | 'privacy-scan';
export declare type ReportFormat =
    | 'axe'
    | 'sarif'
    | 'html'
    | 'consolidated.html'
    | 'json'
    | 'consolidated.json'
    | 'page.mhtml'
    | 'page.png';

/**
 * Defines REST API HTTP GET scan result contract
 */
export interface ScanRunResultResponse {
    scanId: string;
    url: string;
    scanType: ScanType;
    deepScanId?: string;
    run: ScanRun;
    authentication?: AuthenticationResult;
    scannedUrl?: string;
    scanResult?: ScanResult;
    deepScanResult?: DeepScanResultItem[];
    reports?: ScanReport[];
    notification?: ScanCompletedNotification;
    browserValidationResult?: BrowserValidationResult;
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
    source?: ReportSource;
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
    scanRunDetails?: ScanRunDetail[];
}

export interface ScanRunDetail {
    name: ScanDefinitionType;
    state: RunState;
    timestamp?: string;
    error?: string;
    details?: unknown;
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

export interface AuthenticationResult {
    detected: AuthenticationType;
    state: AuthenticationState;
}

export interface BrowserValidationResult {
    highContrastProperties?: ScanState;
}
