// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Page } from 'puppeteer';
import { PageScanner } from '../page-scanner';
import { ScanData } from '../scan-data';
import { BlobStore } from '../storage/store-types';

export type AccessibilityScanOperation = (page: Page, id: string, keyValueStore: BlobStore) => Promise<void>;

export const accessibilityScanOperation: AccessibilityScanOperation = async (
    page: Page,
    id: string,
    keyValueStore: BlobStore,
): Promise<void> => {
    const url = page.url();
    const title = await page.title();

    const scanner = new PageScanner(page);
    const scanResult = await scanner.scan();

    const scanData: ScanData = {
        id,
        title,
        url,
        succeeded: true,
        axeResults: scanResult.axeResults,
    };

    await keyValueStore.setValue(`scan-${id}`, scanData);
    await keyValueStore.setValue(`report-${id}`, scanResult.report.asHTML(), { contentType: 'text/html' });

    if (scanResult.axeResults.violations.length > 0) {
        console.log(`Found ${scanResult.axeResults.violations.length} accessibility issues on ${url} page.`);
    }
};
