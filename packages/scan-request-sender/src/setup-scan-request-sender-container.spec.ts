// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
import { ScanRequestSender } from './sender/request-sender';
import { setupScanRequestSenderContainer } from './setup-scan-request-sender-container';
// tslint:disable: no-any

describe(setupScanRequestSenderContainer, () => {
    beforeEach(() => {
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
    });

    it('verify StorageClient resolution', () => {
        const container = setupScanRequestSenderContainer();

        const storageClient = container.get(StorageClient);

        expect((storageClient as any).dbName).toBe('scanner');
        expect((storageClient as any).collectionName).toBe('a11yIssues');
    });

    it('verify scan request sender dependencies resolution', () => {
        const container = setupScanRequestSenderContainer();
        expect(container.get(ScanRequestSender)).toBeDefined();
    });
});
