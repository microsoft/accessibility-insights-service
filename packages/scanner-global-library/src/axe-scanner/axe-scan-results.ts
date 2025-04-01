// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { ReportSource } from 'storage-documents';
import { BrowserError } from '../browser-error';

export interface AxeScanResults {
    axeResults?: AxeResults;
    error?: string | BrowserError;
    pageResponseCode?: number;
    unscannable?: boolean;
    scannedUrl?: string;
    pageTitle?: string;
    browserSpec?: string;
    userAgent?: string;
    browserResolution?: string;
    pageSnapshot?: string;
    pageScreenshot?: string;
}

export interface ReportResult {
    reportSource: ReportSource;
    axeResults?: AxeResults;
    scannedUrl?: string;
    pageTitle?: string;
    browserSpec?: string;
    userAgent?: string;
    browserResolution?: string;
    pageSnapshot?: string;
    pageScreenshot?: string;
}
