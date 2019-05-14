import 'reflect-metadata';

import { Queue, secretNames, SecretProvider } from 'axis-storage';
import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { Batch } from './batch/batch';
import { BatchServiceClientProvider, jobManagerIocTypeNames } from './job-manager-ioc-types';
import { setupJobManagerContainer } from './setup-job-manager-container';
// tslint:disable: no-any no-unsafe-any no-object-literal-type-assertion

describe(setupJobManagerContainer, () => {
    const batchAccountUrl = 'test-batch-account-url';
    const batchAccountName = 'test-batch-account-name';

    beforeEach(() => {
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';

        process.env.AZ_BATCH_ACCOUNT_NAME = batchAccountName;
        process.env.AZ_BATCH_ACCOUNT_URL = batchAccountUrl;
        process.env.AZ_BATCH_POOL_ID = 'test-batch-pool-id';

        process.env.AZ_BATCH_TASK_PARAMETER = new Buffer(JSON.stringify({ resourceFiles: 'test-resource-files' })).toString('base64');
    });

    describe('BatchServiceClient', () => {
        let secretProviderMock: IMock<SecretProvider>;
        let container: Container;
        const batchAccountKey = 'test-batch-account-key';

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);

            container = setupJobManagerContainer();

            secretProviderMock.setup(async s => s.getSecret(secretNames.batchAccountKey)).returns(async () => batchAccountKey);
            container.unbind(SecretProvider);
            container.bind(SecretProvider).toDynamicValue(() => secretProviderMock.object);
        });

        it('resolves BatchServiceClient', async () => {
            const batchServiceClientProvider: BatchServiceClientProvider = container.get(jobManagerIocTypeNames.BatchServiceClientProvider);

            const batchServiceClient = await batchServiceClientProvider();

            const credJsonString = JSON.stringify(batchServiceClient.credentials);
            expect(batchServiceClient.batchUrl).toBe(batchAccountUrl);
            expect(credJsonString.indexOf(batchAccountKey) >= 0).toBe(true);
            expect(credJsonString.indexOf(batchAccountName) >= 0).toBe(true);
        });

        it('resolves BatchServiceClient top singleton value', async () => {
            const batchServiceClientProvider1: BatchServiceClientProvider = container.get(
                jobManagerIocTypeNames.BatchServiceClientProvider,
            );
            const batchServiceClientProvider2: BatchServiceClientProvider = container.get(
                jobManagerIocTypeNames.BatchServiceClientProvider,
            );

            expect(await batchServiceClientProvider1()).toBe(await batchServiceClientProvider2());
        });
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
