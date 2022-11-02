// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyPageScanReport } from 'storage-documents';
import { BrowserError } from './browser-error';

export interface PrivacyScanResult {
    results?: PrivacyPageScanReport;
    error?: BrowserError;
    pageResponseCode?: number;
    /**
     * Redirected URL if a page was redirected.
     */
    scannedUrl?: string;
    pageSnapshot?: string;
    pageScreenshot?: string;
}
