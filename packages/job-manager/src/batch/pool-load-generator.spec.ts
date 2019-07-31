// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { PoolLoadGenerator, PoolMetricsInfo } from './pool-load-generator';

let poolMetricsInfo: PoolMetricsInfo;

describe(PoolLoadGenerator, () => {
    beforeEach(() => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 4,
                runningTasks: 7,
            },
        };
    });

    it('get tasks increment on first run', () => {
        const poolLoadGenerator = new PoolLoadGenerator();
        expect(poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(64);
        expect(poolLoadGenerator.processingSpeed).toEqual(0);
    });

    it('get tasks increment on next run', () => {
        const poolLoadGenerator = new PoolLoadGenerator();
        expect(poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(64);
        poolLoadGenerator.setLastTasksIncrementCount(52);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 9,
                runningTasks: 12,
            },
        };
        expect(poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(102);
    });

    it('get tasks increment on slow processing', () => {
        const poolLoadGenerator = new PoolLoadGenerator();
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 9,
                runningTasks: 12,
            },
        };
        expect(poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(64);
        poolLoadGenerator.setLastTasksIncrementCount(52);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 91,
                runningTasks: 10,
            },
        };
        expect(poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(0);
    });

    it('get tasks increment on fast processing', () => {
        const poolLoadGenerator = new PoolLoadGenerator();
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 0,
                runningTasks: 0,
            },
        };
        let increment = poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2);
        expect(increment).toEqual(64);
        poolLoadGenerator.setLastTasksIncrementCount(increment);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 0,
                runningTasks: 0,
            },
        };
        increment = poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2);
        expect(increment).toEqual(128);
        poolLoadGenerator.setLastTasksIncrementCount(increment);

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 0,
                runningTasks: 0,
            },
        };
        increment = poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo, 2);
        expect(increment).toEqual(192);
    });
});
