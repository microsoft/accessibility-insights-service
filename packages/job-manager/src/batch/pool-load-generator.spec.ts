// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { PoolLoadGenerator, PoolMetricsInfo } from './pool-load-generator';

let poolMetricsInfo: PoolMetricsInfo;
let poolLoadGenerator: PoolLoadGenerator;
let serviceConfigMock: IMock<ServiceConfiguration>;
let activeToRunningTasksRatio: number;

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
        const increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(60);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);
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
        let increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(42);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 10,
                runningTasks: 12,
            },
        };
        increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(81);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);
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
        let increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(63);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 90,
                runningTasks: 10,
            },
        };
        increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(0);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);
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
        let increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(32);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(1);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 0,
                runningTasks: 2,
            },
        };
        increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(80);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 6,
                runningTasks: 4,
            },
        };
        increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(95);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);
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
        let increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        poolLoadGenerator.setLastTasksIncrementCount(26);
        expect(increment).toEqual(42);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 10,
                runningTasks: 12,
            },
        };
        increment = await poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);
        expect(increment).toEqual(73);
        expect(poolLoadGenerator.activeToRunningTasksRatio).toEqual(2);
    });
});
