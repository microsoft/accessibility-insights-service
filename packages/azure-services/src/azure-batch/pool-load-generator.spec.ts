// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import * as moment from 'moment';
import { IMock, Mock } from 'typemoq';
import { PoolLoadGenerator, PoolLoadSnapshot, PoolMetricsInfo } from './pool-load-generator';

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
            .setup(async s => s.getConfigValue('jobManagerConfig'))
            .returns(async () => {
                return {
                    activeToRunningTasksRatio: activeToRunningTasksRatio,
                    addTasksIntervalInSeconds: 15,
                    maxWallClockTimeInHours: 1,
                };
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
            isIdle: false,
            tasksIncrementCountPerInterval: 60,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        const poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 42,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 81,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: 54,
            tasksProcessingSpeedPerMinute: 1620,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 63,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 0,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: -26,
            tasksProcessingSpeedPerMinute: -780,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 42,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 0,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: -936,
            tasksProcessingSpeedPerMinute: -28080,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: true,
            targetActiveToRunningTasksRatio: 1,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 32,
            poolId: poolMetricsInfo.id,
            poolFillIntervalInSeconds: 15,
            activityState: 2,
            timestamp: dateNow,
        } as PoolLoadSnapshot;
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 80,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: 32,
            tasksProcessingSpeedPerMinute: 960,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 95,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 3,
            tasksProcessingSpeedPerInterval: 74,
            tasksProcessingSpeedPerMinute: 1480,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 42,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        let poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
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
            isIdle: false,
            tasksIncrementCountPerInterval: 73,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 2,
            tasksProcessingSpeedPerInterval: 38,
            tasksProcessingSpeedPerMinute: 1140,
            poolFillIntervalInSeconds: 15,
            activityState: 3,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(1, poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('set correct active state flag on overflow when pool is active', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 22,
                runningTasks: 7,
            },
        };
        const expectedPoolLoadSnapshot = {
            isIdle: false,
            tasksIncrementCountPerInterval: 42,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            poolFillIntervalInSeconds: 15,
            activityState: 2147483647,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        const poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(2147483647, poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('set correct active state flag on overflow when pool is idle', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 0,
                runningTasks: 1,
            },
        };
        const expectedPoolLoadSnapshot = {
            isIdle: true,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            poolFillIntervalInSeconds: 15,
            activityState: 2147483646,
            timestamp: dateNow,
        } as PoolLoadSnapshot;
        const poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(2147483647, poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });

    it('set correct active state flag', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 2,
                runningTasks: 1,
            },
        };
        const expectedPoolLoadSnapshot = {
            isIdle: false,
            tasksIncrementCountPerInterval: 62,
            targetActiveToRunningTasksRatio: 2,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetMaxTasksPerPool: 64,
            poolId: poolMetricsInfo.id,
            samplingIntervalInSeconds: 1,
            tasksProcessingSpeedPerInterval: 0,
            tasksProcessingSpeedPerMinute: 0,
            poolFillIntervalInSeconds: 15,
            activityState: 571475009,
            timestamp: dateNow,
            ...poolMetricsInfo.load,
        } as PoolLoadSnapshot;
        const poolLoadSnapshot = await poolLoadGenerator.getPoolLoadSnapshot(285737504, poolMetricsInfo);
        expect(poolLoadSnapshot).toEqual(expectedPoolLoadSnapshot);
    });
});
