// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanRunErrorCodeName } from '../scan-run-error-codes';
import { WebApiError } from '../web-api-error-codes';

export declare type LinkType = 'self';
export declare type ReportFormat = 'sarif' | 'html';
export declare type ScanState = 'pending' | 'pass' | 'fail';
export declare type RunState = 'pending' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';

export declare type ScanResultResponse = ScanRunResultResponse | ScanRunErrorResponse;

export interface ScanRunResultResponse {
    scanId: string;
    url: string;
    scannedUrl?: string;
    scanResult?: ScanResult;
    reports?: ScanReport[];
    run: ScanRun;
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
