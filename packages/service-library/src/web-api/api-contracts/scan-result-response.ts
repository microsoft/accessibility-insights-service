// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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
export declare type ScanType = 'privacy';
export declare type ScanResultResponse = ScanRunResultResponse | ScanRunErrorResponse;
export declare type AuthenticationState = 'succeeded' | 'failed' | 'unauthenticated';

// Construct to support type guard
export const authenticationTypes = ['undetermined', 'entraId'] as const;
export declare type AuthenticationType = (typeof authenticationTypes)[number];

// Construct to support type guard
export declare type ReportSource = 'privacy-scan';
export declare type ReportFormat = 'json' | 'consolidated.json' | 'page.mhtml' | 'page.png';

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
}

export interface ScanRunErrorResponse {
    scanId: string;
    error: WebApiError;
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
