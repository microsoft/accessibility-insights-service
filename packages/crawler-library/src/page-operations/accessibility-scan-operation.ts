// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Page } from 'puppeteer';
import { PageScanner } from '../page-scanner';
import { BlobStore } from '../storage/store-types';

export type AccessibilityScanOperation = (page: Page, id: string, keyValueStore: BlobStore) => Promise<void>;

export const accessibilityScanOperation: AccessibilityScanOperation = async (
    page: Page,
    id: string,
    keyValueStore: BlobStore,
): Promise<void> => {
    const scanner = new PageScanner(page);
    const scanResult = await scanner.scan();

    await keyValueStore.setValue(`axe-${id}`, scanResult.axeResults);
    await keyValueStore.setValue(`report-${id}`, scanResult.report.asHTML(), { contentType: 'text/html' });

    if (scanResult.axeResults.violations.length > 0) {
        console.log(`Found ${scanResult.axeResults.violations.length} accessibility issues on ${page.url()} page.`);
    }
};
