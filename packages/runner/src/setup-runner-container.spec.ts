import 'reflect-metadata';

import { StorageClient } from 'axis-storage';
import { Runner } from './runner/runner';
import { setupRunnerContainer } from './setup-runner-container';
// tslint:disable: no-any

describe(setupRunnerContainer, () => {
    beforeEach(() => {
        process.env.AZURE_STORAGE_ACCOUNT = 'test-storage-account';
        process.env.AZURE_STORAGE_ACCESS_KEY = Buffer.from('test-access-key').toString('base64');
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
        process.env.AZURE_COSMOS_DB_URL = 'test-cosmos-db-url';
        process.env.AZURE_COSMOS_DB_KEY = 'test-cosmos-db-key';
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
