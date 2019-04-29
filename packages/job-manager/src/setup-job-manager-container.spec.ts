import 'reflect-metadata';

import { Queue } from 'axis-storage';
import { ServiceClient } from 'azure-batch';
import { Container } from 'inversify';
import { Batch } from './batch/batch';
import { setupJobManagerContainer } from './setup-job-manager-container';
// tslint:disable: no-any no-unsafe-any

describe(setupJobManagerContainer, () => {
    const batchAccountUrl = 'test-batch-account-url';
    const batchAccountName = 'test-batch-account-name';
    const batchAccountKey = 'test-batch-account-key';

    beforeEach(() => {
        process.env.AZURE_STORAGE_ACCOUNT = 'test-storage-account';
        process.env.AZURE_STORAGE_ACCESS_KEY = Buffer.from('test-access-key').toString('base64');
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
        process.env.AZURE_COSMOS_DB_URL = 'test-cosmos-db-url';
        process.env.AZURE_COSMOS_DB_KEY = 'test-cosmos-db-key';

        process.env.AZ_BATCH_ACCOUNT_KEY = batchAccountKey;
        process.env.AZ_BATCH_ACCOUNT_NAME = batchAccountName;
        process.env.AZ_BATCH_ACCOUNT_URL = batchAccountUrl;
        process.env.AZ_BATCH_POOL_ID = 'test-batch-pool-id';

        process.env.AZ_BATCH_TASK_PARAMETER = new Buffer(JSON.stringify({ resourceFiles: 'test-resource-files' })).toString('base64');
    });

    it('verify BatchServiceClient resolution', () => {
        const container = setupJobManagerContainer();

        const batchServiceClient = container.get(ServiceClient.BatchServiceClient);
        const credJsonString = JSON.stringify(batchServiceClient.credentials);

        expect(batchServiceClient.batchUrl).toBe(batchAccountUrl);
        expect(credJsonString.indexOf(batchAccountKey) >= 0).toBe(true);
        expect(credJsonString.indexOf(batchAccountName) >= 0).toBe(true);
        verifyNonSingletonDependencyResolution(container, ServiceClient.BatchServiceClient);
    });

    it('verify JobManager dependencies resolution', () => {
        const container = setupJobManagerContainer();

        verifyNonSingletonDependencyResolution(container, Queue);
        verifySingletonDependencyResolution(container, Batch);
    });

    function verifySingletonDependencyResolution(container: Container, key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toBe(container.get(key));
    }

    function verifyNonSingletonDependencyResolution(container: Container, key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).not.toBe(container.get(key));
    }
});
