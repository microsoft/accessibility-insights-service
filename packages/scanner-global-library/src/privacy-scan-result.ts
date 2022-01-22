// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BrowserError } from './browser-error';

export interface PrivacyScanResult {
    results?: unknown; // TBD
    error?: string | BrowserError;
    pageResponseCode?: number;
    scannedUrl?: string;
}
