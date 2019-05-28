// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { CredentialsProvider, Queue, SecretProvider } from 'axis-storage';
import { Container, interfaces } from 'inversify';
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
        let credentailsProviderMock: IMock<CredentialsProvider>;
        let credentialsStub: msRestNodeAuth.ApplicationTokenCredentials;

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);

            container = setupJobManagerContainer();
            credentailsProviderMock = Mock.ofType(CredentialsProvider);
            credentialsStub = new msRestNodeAuth.ApplicationTokenCredentials('clientId', 'domain', 'secret');

            credentailsProviderMock.setup(async c => c.getCredentialsForBatch()).returns(async () => Promise.resolve(credentialsStub));

            stubBinding(container, SecretProvider, secretProviderMock.object);
            stubBinding(container, CredentialsProvider, credentailsProviderMock.object);
        });

        it('resolves BatchServiceClient', async () => {
            const batchServiceClientProvider: BatchServiceClientProvider = container.get(jobManagerIocTypeNames.BatchServiceClientProvider);

            const batchServiceClient = await batchServiceClientProvider();

            expect(batchServiceClient.credentials).toBe(credentialsStub);
            expect(batchServiceClient.batchUrl).toBe(batchAccountUrl);
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

    function stubBinding(container: Container, bindingName: interfaces.ServiceIdentifier<any>, value: any): void {
        container.unbind(bindingName);
        container.bind(bindingName).toDynamicValue(() => value);
    }
});
