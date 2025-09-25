// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ReportSource } from 'storage-documents';
import { BrowserError } from './browser-error';

export interface ValidationScanResults {
    validationResults?: any;
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
    validationResults?: ValidationScanResults;
    scannedUrl?: string;
    pageTitle?: string;
    browserSpec?: string;
    userAgent?: string;
    browserResolution?: string;
    pageSnapshot?: string;
    pageScreenshot?: string;
}
