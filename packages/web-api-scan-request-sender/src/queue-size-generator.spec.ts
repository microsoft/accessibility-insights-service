// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Batch, SystemConfig } from 'azure-services';
import { QueueRuntimeConfig, ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import * as moment from 'moment';
import { ScanProcessingStateProvider } from 'service-library';
import { BatchPoolLoadSnapshot, ScanQueueLoadSnapshot, StorageDocument } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { QueueSizeGenerator } from './queue-size-generator';

// tslint:disable: no-object-literal-type-assertion no-unsafe-any

export class MockableLogger extends Logger {}

const configQueueSize = 113;
const jobScheduleRunIntervalInMinutes = 2;
const dateNow = new Date('2019-12-12T12:00:00.000Z');
let loggerMock: IMock<MockableLogger>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let scanProcessingStateProviderMock: IMock<ScanProcessingStateProvider>;
let batchMock: IMock<Batch>;
let currentQueueSize: number;
let systemConfigStub: SystemConfig;
let queueSizeGenerator: QueueSizeGenerator;

describe(QueueSizeGenerator, () => {
    beforeEach(() => {
        currentQueueSize = 7;
        loggerMock = Mock.ofType(MockableLogger);
        scanProcessingStateProviderMock = Mock.ofType(ScanProcessingStateProvider);
        moment.prototype.toDate = () => dateNow;

        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async s => s.getConfigValue('queueConfig'))
            .returns(async () => Promise.resolve({ maxQueueSize: configQueueSize } as QueueRuntimeConfig));

        systemConfigStub = {
            storageName: 'storage-name',
            scanQueue: 'scan-queue',
            batchAccountName: 'batch-account-name',
        };

        batchMock = Mock.ofType(Batch);
        batchMock
            .setup(async o => o.getJobScheduleRunIntervalInMinutes())
            .returns(async () => Promise.resolve(jobScheduleRunIntervalInMinutes))
            .verifiable(Times.once());

        queueSizeGenerator = new QueueSizeGenerator(
            batchMock.object,
            scanProcessingStateProviderMock.object,
            serviceConfigMock.object,
            systemConfigStub,
            loggerMock.object,
        );
    });

    afterEach(() => {
        batchMock.verifyAll();
        scanProcessingStateProviderMock.verifyAll();
    });

    it('reset buffering index when Batch pool is stable idle and queue is not empty', async () => {
        const expectedTargetQueueSize = 640;
        const expectedScanQueueLoadSnapshot = {
            ...({} as StorageDocument),
            storageAccountName: systemConfigStub.storageName,
            queueName: systemConfigStub.scanQueue,
            queueSizePerInterval: expectedTargetQueueSize,
            queueBufferingIndex: 1, // should reset index
            samplingIntervalInSeconds: jobScheduleRunIntervalInMinutes * 60,
            timestamp: moment().toDate(),
        };
        const batchPoolLoadSnapshot = {
            isIdle: true,
            targetMaxTasksPerPool: 64,
            poolFillIntervalInSeconds: 15,
            activityStateFlags: 0,
        } as BatchPoolLoadSnapshot;

        scanProcessingStateProviderMock
            .setup(async o => o.readBatchPoolLoadSnapshot(systemConfigStub.batchAccountName, 'urlScanPool'))
            .returns(async () => Promise.resolve(batchPoolLoadSnapshot))
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.writeScanQueueLoadSnapshot(expectedScanQueueLoadSnapshot, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        const actualTargetQueueSize = await queueSizeGenerator.getTargetQueueSize(currentQueueSize);

        expect(actualTargetQueueSize).toEqual(expectedTargetQueueSize);
    });

    it('create queue size when Batch pool is idle and queue is empty', async () => {
        const queueBufferingIndex = 3;
        const expectedTargetQueueSize = 2368;
        const expectedScanQueueLoadSnapshot = {
            ...({} as StorageDocument),
            storageAccountName: systemConfigStub.storageName,
            queueName: systemConfigStub.scanQueue,
            queueSizePerInterval: expectedTargetQueueSize,
            queueBufferingIndex: queueBufferingIndex + 1, // should increase last index
            samplingIntervalInSeconds: jobScheduleRunIntervalInMinutes * 60,
            timestamp: moment().toDate(),
        };
        const batchPoolLoadSnapshot = {
            isIdle: true,
            targetMaxTasksPerPool: 64,
            poolFillIntervalInSeconds: 15,
            activityStateFlags: 1,
        } as BatchPoolLoadSnapshot;
        const scanQueueLoadSnapshot = { queueBufferingIndex: queueBufferingIndex } as ScanQueueLoadSnapshot;

        scanProcessingStateProviderMock
            .setup(async o => o.readBatchPoolLoadSnapshot(systemConfigStub.batchAccountName, 'urlScanPool'))
            .returns(async () => Promise.resolve(batchPoolLoadSnapshot))
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.writeScanQueueLoadSnapshot(expectedScanQueueLoadSnapshot, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.readScanQueueLoadSnapshot(systemConfigStub.storageName, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve(scanQueueLoadSnapshot))
            .verifiable(Times.once());

        const actualTargetQueueSize = await queueSizeGenerator.getTargetQueueSize(0);

        expect(actualTargetQueueSize).toEqual(expectedTargetQueueSize);
    });

    it('create queue size when Batch pool is active and queue is empty', async () => {
        const queueBufferingIndex = 3;
        const expectedTargetQueueSize = 2108;
        const expectedScanQueueLoadSnapshot = {
            ...({} as StorageDocument),
            storageAccountName: systemConfigStub.storageName,
            queueName: systemConfigStub.scanQueue,
            queueSizePerInterval: expectedTargetQueueSize,
            queueBufferingIndex: queueBufferingIndex + 1, // should increase last index
            samplingIntervalInSeconds: jobScheduleRunIntervalInMinutes * 60,
            timestamp: moment().toDate(),
        };
        const batchPoolLoadSnapshot = {
            isIdle: false,
            targetMaxTasksPerPool: 64,
            poolFillIntervalInSeconds: 15,
            tasksIncrementCountPerInterval: 73,
            samplingIntervalInSeconds: 20,
            activityStateFlags: 3,
        } as BatchPoolLoadSnapshot;
        const scanQueueLoadSnapshot = { queueBufferingIndex: queueBufferingIndex } as ScanQueueLoadSnapshot;

        scanProcessingStateProviderMock
            .setup(async o => o.readBatchPoolLoadSnapshot(systemConfigStub.batchAccountName, 'urlScanPool'))
            .returns(async () => Promise.resolve(batchPoolLoadSnapshot))
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.writeScanQueueLoadSnapshot(expectedScanQueueLoadSnapshot, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.readScanQueueLoadSnapshot(systemConfigStub.storageName, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve(scanQueueLoadSnapshot))
            .verifiable(Times.once());

        const actualTargetQueueSize = await queueSizeGenerator.getTargetQueueSize(0);

        expect(actualTargetQueueSize).toEqual(expectedTargetQueueSize);
    });

    it('create queue size when Batch pool is active and queue is not empty', async () => {
        const queueBufferingIndex = 3;
        const expectedTargetQueueSize = 1597;
        const expectedScanQueueLoadSnapshot = {
            ...({} as StorageDocument),
            storageAccountName: systemConfigStub.storageName,
            queueName: systemConfigStub.scanQueue,
            queueSizePerInterval: expectedTargetQueueSize,
            queueBufferingIndex: queueBufferingIndex, // should use last index
            samplingIntervalInSeconds: jobScheduleRunIntervalInMinutes * 60,
            timestamp: moment().toDate(),
        };
        const batchPoolLoadSnapshot = {
            isIdle: false,
            targetMaxTasksPerPool: 64,
            poolFillIntervalInSeconds: 15,
            tasksIncrementCountPerInterval: 73,
            samplingIntervalInSeconds: 20,
            activityStateFlags: 3,
        } as BatchPoolLoadSnapshot;
        const scanQueueLoadSnapshot = { queueBufferingIndex: queueBufferingIndex } as ScanQueueLoadSnapshot;

        scanProcessingStateProviderMock
            .setup(async o => o.readBatchPoolLoadSnapshot(systemConfigStub.batchAccountName, 'urlScanPool'))
            .returns(async () => Promise.resolve(batchPoolLoadSnapshot))
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.writeScanQueueLoadSnapshot(expectedScanQueueLoadSnapshot, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.readScanQueueLoadSnapshot(systemConfigStub.storageName, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve(scanQueueLoadSnapshot))
            .verifiable(Times.once());

        const actualTargetQueueSize = await queueSizeGenerator.getTargetQueueSize(currentQueueSize);

        expect(actualTargetQueueSize).toEqual(expectedTargetQueueSize);
    });

    it('create queue size when Batch pool is idle and queue is not empty', async () => {
        const queueBufferingIndex = 3;
        const expectedTargetQueueSize = 1792;
        const expectedScanQueueLoadSnapshot = {
            ...({} as StorageDocument),
            storageAccountName: systemConfigStub.storageName,
            queueName: systemConfigStub.scanQueue,
            queueSizePerInterval: expectedTargetQueueSize,
            queueBufferingIndex: queueBufferingIndex, // should use last index
            samplingIntervalInSeconds: jobScheduleRunIntervalInMinutes * 60,
            timestamp: moment().toDate(),
        };
        const batchPoolLoadSnapshot = {
            isIdle: true,
            targetMaxTasksPerPool: 64,
            poolFillIntervalInSeconds: 15,
            activityStateFlags: 1,
        } as BatchPoolLoadSnapshot;
        const scanQueueLoadSnapshot = { queueBufferingIndex: queueBufferingIndex } as ScanQueueLoadSnapshot;

        scanProcessingStateProviderMock
            .setup(async o => o.readBatchPoolLoadSnapshot(systemConfigStub.batchAccountName, 'urlScanPool'))
            .returns(async () => Promise.resolve(batchPoolLoadSnapshot))
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.writeScanQueueLoadSnapshot(expectedScanQueueLoadSnapshot, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.readScanQueueLoadSnapshot(systemConfigStub.storageName, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve(scanQueueLoadSnapshot))
            .verifiable(Times.once());

        const actualTargetQueueSize = await queueSizeGenerator.getTargetQueueSize(currentQueueSize);

        expect(actualTargetQueueSize).toEqual(expectedTargetQueueSize);
    });

    it('create default queue size when Batch pool load is not available', async () => {
        const expectedTargetQueueSize = configQueueSize;
        const expectedScanQueueLoadSnapshot = {
            ...({} as StorageDocument),
            storageAccountName: systemConfigStub.storageName,
            queueName: systemConfigStub.scanQueue,
            queueSizePerInterval: expectedTargetQueueSize,
            queueBufferingIndex: 1,
            samplingIntervalInSeconds: jobScheduleRunIntervalInMinutes * 60,
            timestamp: moment().toDate(),
        };

        scanProcessingStateProviderMock
            .setup(async o => o.readBatchPoolLoadSnapshot(systemConfigStub.batchAccountName, 'urlScanPool'))
            .returns(async () => Promise.resolve(undefined))
            .verifiable(Times.once());
        scanProcessingStateProviderMock
            .setup(async o => o.writeScanQueueLoadSnapshot(expectedScanQueueLoadSnapshot, 'onDemandScanRequest'))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        const actualTargetQueueSize = await queueSizeGenerator.getTargetQueueSize(currentQueueSize);

        expect(actualTargetQueueSize).toEqual(expectedTargetQueueSize);
    });
});
