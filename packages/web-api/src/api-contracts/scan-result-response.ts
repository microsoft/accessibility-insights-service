// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { WebApiErrorCodeName } from 'service-library';

export declare type LinkType = 'self';
export declare type ReportFormat = 'sarif';
export declare type ScanState = 'pending' | 'pass' | 'fail';
export declare type RunState = 'pending' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';

export declare type ScanResultResponse =
    | {
          scanId: string;
          url: string;
          scanResult?: ScanResult;
          reports?: ScanReport[];
          run: ScanRun;
      }
    | ScanResultErrorResponse;

export interface ScanResultErrorResponse {
    scanId: string;
    code: WebApiErrorCodeName;
    error: string;
}

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
