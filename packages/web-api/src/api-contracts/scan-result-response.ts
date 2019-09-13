// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export declare type LinkType = 'self';
export declare type ReportFormat = 'sarif';
export declare type ScanState = 'unknown' | 'pass' | 'fail';
export declare type RunState = 'unknown' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';

export interface ScanResultErrorResponse {
    scanId: string;
    error: string;
}

export type ScanResultResponse =
    | {
          scanId: string;
          url: string;
          scanResult?: ScanResult;
          reports?: ScanReport[];
          run: ScanRun;
      }
    | ScanResultErrorResponse;

export interface ScanResult {
    state: ScanState;
    issueCount?: number;
}

export interface ScanReport {
    reportId: string;
    format: ReportFormat;
    links?: Links;
}

export interface ScanRun {
    state: RunState;
    timestamp?: string;
    error?: string;
}

export interface Links {
    rel: LinkType;
    href: string;
}
