import 'reflect-metadata';

import { Queue } from 'axis-storage';
import { setupJobManagerContainer } from './setup-job-manager-container';

describe(setupJobManagerContainer, () => {
    beforeEach(() => {
        process.env.AZURE_STORAGE_ACCOUNT = 'test-storage-account';
        process.env.AZURE_STORAGE_ACCESS_KEY = btoa('test-access-key');
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
        process.env.AZURE_COSMOS_DB_URL = 'test-cosmos-db-url';
        process.env.AZURE_COSMOS_DB_KEY = 'test-cosmos-db-key';
    });

    it('verify axis storage resolution', () => {
        const container = setupJobManagerContainer();

        expect(container.get(Queue)).toBeDefined();
    });
});
