// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
import { Runner } from './runner/runner';
import { setupRunnerContainer } from './setup-runner-container';
// tslint:disable: no-any

describe(setupRunnerContainer, () => {
    beforeEach(() => {
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
    });

    it('verify StorageClient resolution', () => {
        const container = setupRunnerContainer();

        const storageClient = container.get(StorageClient);

        expect((storageClient as any).dbName).toBe('scanner');
        expect((storageClient as any).collectionName).toBe('a11yIssues');
    });

    it('verify runner dependencies resolution', () => {
        const container = setupRunnerContainer();

        expect(container.get(Runner)).toBeDefined();
    });
});
