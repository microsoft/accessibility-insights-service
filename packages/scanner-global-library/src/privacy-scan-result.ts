// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyPageScanReport } from 'storage-documents';
import { BrowserError } from './browser-error';

export interface PrivacyScanResult {
    results?: PrivacyPageScanReport;
    error?: string | BrowserError;
    pageResponseCode?: number;
    scannedUrl?: string;
}
