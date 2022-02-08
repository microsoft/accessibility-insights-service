// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyPageScanReport } from 'storage-documents';
import * as Puppeteer from 'puppeteer';

export type PrivacyResults = Omit<PrivacyPageScanReport, 'HttpStatusCode'>;

export type ReloadPageResponse = {
    success: boolean;
    error?: unknown;
};

export type ReloadPageFunc = (page: Puppeteer.Page) => Promise<ReloadPageResponse>;
