// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Batch, BatchConfig, Message, PoolMetricsInfo, Queue, StorageConfig } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, System } from 'common';
import { ScanMessage } from 'service-library';
import { IMock, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { SendNotificationTaskCreator } from './send-notification-task-creator';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */

class TestableSendNotificationTaskCreator extends SendNotificationTaskCreator {
    public async getMessagesForTaskCreation(): Promise<ScanMessage[]> {
        return super.getMessagesForTaskCreation();
    }
}

const jobGroup = 'jobGroup';
const sendNotificationTasksCount = 10;

describe(SendNotificationTaskCreator, () => {
    let taskCreator: TestableSendNotificationTaskCreator;
    let batchMock: IMock<Batch>;
    let queueMock: IMock<Queue>;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let systemMock: IMock<typeof System>;
    let storageConfigStub: StorageConfig;
    let poolMetricsInfo: PoolMetricsInfo;

    const batchConfig: BatchConfig = {
        accountName: 'batch-account-name',
        accountUrl: '',
        poolId: 'pool-Id',
        jobId: 'batch-job-id',
    } as BatchConfig;

    beforeEach(async () => {
        batchMock = Mock.ofType(Batch);
        queueMock = Mock.ofType(Queue);
        loggerMock = Mock.ofType(MockableLogger);
        systemMock = Mock.ofInstance(System);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        poolMetricsInfo = {
            load: {
                activeTasks: 1,
                runningTasks: 1,
            },
        } as PoolMetricsInfo;
        storageConfigStub = {
            notificationQueue: 'test-notification-queue',
        } as StorageConfig;
        serviceConfigMock
            .setup((o) => o.getConfigValue('jobManagerConfig'))
            .returns(() => Promise.resolve({ sendNotificationJobGroup: jobGroup, sendNotificationTasksCount } as JobManagerConfig))
            .verifiable();
        batchMock
            .setup((b) => b.getPoolMetricsInfo(jobGroup))
            .returns(async () => Promise.resolve(poolMetricsInfo))
            .verifiable(Times.once());

        taskCreator = new TestableSendNotificationTaskCreator(
            batchMock.object,
            queueMock.object,
            batchConfig,
            serviceConfigMock.object,
            storageConfigStub,
            loggerMock.object,
            systemMock.object,
        );
        await taskCreator.init();
    });

    describe('getMessagesForTaskCreation', () => {
        it('returns empty array if no messages in queue', async () => {
            poolMetricsInfo.load.activeTasks = 1;
            poolMetricsInfo.load.runningTasks = 1;
            queueMock
                .setup(async (q) => q.getMessagesWithTotalCount(storageConfigStub.notificationQueue, 9))
                .returns(async () => Promise.resolve([]))
                .verifiable(Times.once());

            await expect(taskCreator.getMessagesForTaskCreation()).resolves.toEqual([]);
        });

        test.each([
            {
                activeTasks: 1,
                runningTasks: 10,
            },
            {
                activeTasks: 10,
                runningTasks: 1,
            },
            {
                activeTasks: 0,
                runningTasks: 15,
            },
        ])('returns empty array if max number of tasks are in active/pending state - %o', async (poolLoad) => {
            poolMetricsInfo.load = poolLoad;

            await expect(taskCreator.getMessagesForTaskCreation()).resolves.toEqual([]);
        });

        test.each([
            {
                activeTasks: 1,
                runningTasks: 9,
            },
            {
                activeTasks: 9,
                runningTasks: 1,
            },
            {
                activeTasks: 0,
                runningTasks: 1,
            },
            {
                activeTasks: 1,
                runningTasks: 0,
            },
        ])('returns messages from queue - %o', async (poolLoad) => {
            const expectedMessageCount = sendNotificationTasksCount - (poolLoad.activeTasks + poolLoad.runningTasks - 1);
            const messages: Message[] = [
                {
                    messageId: 'messageId-1',
                    messageText: JSON.stringify({
                        scanId: 'scanId-1',
                    }),
                },
                {
                    messageId: 'messageId-2',
                    messageText: JSON.stringify({
                        scanId: 'scanId-2',
                    }),
                },
            ];
            poolMetricsInfo.load = poolLoad;

            queueMock
                .setup(async (q) => q.getMessagesWithTotalCount(storageConfigStub.notificationQueue, expectedMessageCount))
                .returns(async () => Promise.resolve(messages))
                .verifiable(Times.once());

            const expectedMessages = messages.map((message) => {
                return {
                    scanId: JSON.parse(message.messageText).scanId,
                    messageId: message.messageId,
                    message: message,
                };
            });

            await expect(taskCreator.getMessagesForTaskCreation()).resolves.toEqual(expectedMessages);
        });
    });

    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
        serviceConfigMock.verifyAll();
        systemMock.verifyAll();
        loggerMock.verifyAll();
    });
});
