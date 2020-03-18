// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Batch, BatchConfig, Queue } from 'azure-services';
import { IMock, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { SendNotificationTaskCreator } from './send-notification-task-creator';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion no-any mocha-no-side-effect-code no-null-keyword
describe(SendNotificationTaskCreator, () => {
    let taskCreator: SendNotificationTaskCreator;
    let batchMock: IMock<Batch>;
    let queueMock: IMock<Queue>;
    let loggerMock: IMock<MockableLogger>;
    const batchConfig: BatchConfig = {
        accountName: 'batch-account-name',
        accountUrl: '',
        poolId: 'pool-Id',
        jobId: 'batch-job-id',
    };

    beforeEach(() => {
        batchMock = Mock.ofType(Batch);
        queueMock = Mock.ofType(Queue);
        loggerMock = Mock.ofType(MockableLogger);

        queueMock.setup(o => o.scanQueue).returns(() => 'scan-queue');

        taskCreator = new SendNotificationTaskCreator(batchMock.object, queueMock.object, batchConfig, loggerMock.object);
    });

    it('not implemented', async () => {
        await taskCreator.run();
    });

    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
    });
});
