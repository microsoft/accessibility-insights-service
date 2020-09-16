// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';
import { BrowserError } from 'scanner-global-library';

export interface AxeScanResults {
    results?: AxeResults;
    error?: string | BrowserError;
    pageResponseCode?: number;
    unscannable?: boolean;
    scannedUrl?: string;
    pageTitle?: string;
    browserSpec?: string;
}
