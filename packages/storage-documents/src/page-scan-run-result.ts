// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from '.';

export declare type ReportFormat = 'sarif';
export declare type ScanState = 'unknown' | 'pass' | 'fail';
export declare type RunState = 'unknown' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';

/**
 * The web page scan run result document.
 */
export interface PageScanRunResult extends StorageDocument {
    scanId: string;
    url: string;
    scanResult?: ScanResult;
    reports?: ScanReport[];
    run: ScanRun;
}

export interface ScanResult {
    state: ScanState;
    issueCount?: number;
}

export interface ScanReport {
    reportId: string;
    format: ReportFormat;
    href: string;
}

export interface ScanRun {
    state: RunState;
    timestamp?: string;
    error?: string;
}
