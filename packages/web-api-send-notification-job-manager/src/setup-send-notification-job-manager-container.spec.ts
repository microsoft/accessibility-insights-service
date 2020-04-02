// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Batch, BatchTaskConfigGenerator, BatchTaskPropertyProvider, Queue } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { Container } from 'inversify';
import { setupSendNotificationJobManagerContainer } from './setup-send-notification-job-manager-container';

// tslint:disable: no-any no-unsafe-any no-object-literal-type-assertion

describe(setupSendNotificationJobManagerContainer, () => {
    const batchAccountUrl = 'test-batch-account-url';
    const batchAccountName = 'test-batch-account-name';

    beforeEach(() => {
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
        process.env.AZURE_STORAGE_NOTIFICATION_QUEUE = 'test-notification-queue';
        process.env.AZ_BATCH_ACCOUNT_NAME = batchAccountName;
        process.env.AZ_BATCH_ACCOUNT_URL = batchAccountUrl;
        process.env.AZ_BATCH_POOL_ID = 'test-batch-pool-id';
    });

    test.each([BatchTaskPropertyProvider, ServiceConfiguration])('resolves %p to singleton value', (key) => {
        const container = setupSendNotificationJobManagerContainer();

        verifySingletonDependencyResolution(container, key);
    });

    it('resolves batch task config generator to non singleton value', () => {
        const container = setupSendNotificationJobManagerContainer();

        verifyNonSingletonDependencyResolution(container, BatchTaskConfigGenerator);
    });

    it('verify JobManager dependencies resolution', () => {
        const container = setupSendNotificationJobManagerContainer();

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
