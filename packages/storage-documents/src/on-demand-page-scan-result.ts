// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from '.';
import { ItemType } from './item-type';

export declare type ReportFormat = 'sarif';
export declare type ScanState = 'unknown' | 'pass' | 'fail';
export declare type OnDemandPageScanRunState = 'unknown' | 'accepted' | 'queued' | 'running' | 'completed' | 'failed';

/**
 * The web page scan run result document.
 */
export interface OnDemandPageScanResult extends StorageDocument {
    url: string;
    scanResult?: OnDemandScanResult;
    reports?: OnDemandPageScanReport[];
    run: OnDemandPageScanRunResult;
    priority: number;
    itemType: ItemType.onDemandPageScanRunResult;
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
    error?: string;
}
