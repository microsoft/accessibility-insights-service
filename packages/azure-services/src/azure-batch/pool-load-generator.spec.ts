// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { JobManagerConfig, ServiceConfiguration } from 'common';
import * as moment from 'moment';
import { IMock, Mock } from 'typemoq';
import { PoolLoadGenerator, PoolMetricsInfo } from './pool-load-generator';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion

let poolMetricsInfo: PoolMetricsInfo;
let poolLoadGenerator: PoolLoadGenerator;
let serviceConfigMock: IMock<ServiceConfiguration>;
let activeToRunningTasksRatio: number;
const dateNow = new Date('2019-12-12T12:00:00.000Z');

describe(PoolLoadGenerator, () => {
    beforeEach(() => {
        activeToRunningTasksRatio = 2;
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('jobManagerConfig'))
            .returns(async () => {
                return {
                    activeToRunningTasksRatio: activeToRunningTasksRatio,
                    addTasksIntervalInSeconds: 15,
                    maxWallClockTimeInHours: 1,
                } as JobManagerConfig;
            });

        jest.spyOn(process, 'hrtime').mockImplementation((time?: [number, number]) => [5, 0]);
        moment.prototype.toDate = () => dateNow;

        poolLoadGenerator = new PoolLoadGenerator(serviceConfigMock.object);
    });

    it('get tasks increment on initial run', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 4,
                runningTasks: 7,
            },
        };
        const expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 60,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        const poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('get tasks increment when ration is enough to compensate processing speed', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 22,
                runningTasks: 7,
            },
        };
        let expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 42,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);

        jest.spyOn(process, 'hrtime').mockImplementation((time?: [number, number]) => [7, 0]);
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 10,
                runningTasks: 12,
            },
        };
        expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 81,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: 54,
            tasksProcessingSpeedPerMinute: 1620,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('get tasks increment on a slow tasks processing', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 1,
                runningTasks: 12,
            },
        };
        let expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 63,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);

        jest.spyOn(process, 'hrtime').mockImplementation((time?: [number, number]) => [7, 0]);
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 90,
                runningTasks: 10,
            },
        };
        expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 0,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: -26,
            tasksProcessingSpeedPerMinute: -780,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('reduce ratio on a slow tasks processing', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 22,
                runningTasks: 7,
            },
        };
        let expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 42,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);

        jest.spyOn(process, 'hrtime').mockImplementation((time?: [number, number]) => [7, 0]);
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 1000,
                runningTasks: 12,
            },
        };
        expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 0,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: -936,
            tasksProcessingSpeedPerMinute: -28080,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('get tasks increment when initial ration is not enough to compensate processing speed', async () => {
        activeToRunningTasksRatio = 1;
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 0,
                runningTasks: 0,
            },
        };
        let expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 32,
            targetActiveToRunningTasksRatio: 1,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);

        jest.spyOn(process, 'hrtime').mockImplementation((time?: [number, number]) => [7, 0]);
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 0,
                runningTasks: 2,
            },
        };
        expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 80,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: 32,
            tasksProcessingSpeedPerMinute: 960,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);

        jest.spyOn(process, 'hrtime').mockImplementation((time?: [number, number]) => [10, 0]);
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 6,
                runningTasks: 4,
            },
        };
        expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 95,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 3,
            tasksProcessingSpeedPerInterval: 74,
            tasksProcessingSpeedPerMinute: 1480,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('get tasks increment when actual added tasks count is different from calculated value', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 22,
                runningTasks: 7,
            },
        };
        let expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 42,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        poolLoadGenerator.setLastTasksIncrementCount(26);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);

        jest.spyOn(process, 'hrtime').mockImplementation((time?: [number, number]) => [7, 0]);
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 10,
                runningTasks: 12,
            },
        };
        expectedPoolLoadSnapshot = {
            tasksIncrementCountPerInterval: 73,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: 38,
            tasksProcessingSpeedPerMinute: 1140,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        };
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });
});
