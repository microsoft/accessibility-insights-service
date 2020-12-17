// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';
import { BrowserError } from './browser-error';

export interface AxeScanResults {
    results?: AxeResults;
    error?: string | BrowserError;
    pageResponseCode?: number;
    unscannable?: boolean;
    scannedUrl?: string;
    pageTitle?: string;
    browserSpec?: string;
    userAgent?: string;
}
