// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { PoolMetrics, PoolMetricsInfo } from './pool-metrics';

let poolMetricsInfo: PoolMetricsInfo;

describe(PoolMetrics, () => {
    beforeEach(() => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 4,
                runningTasks: 7,
                pendingTasks: 11,
            },
        };
    });

    it('get tasks increment on first run', () => {
        const poolMetrics = new PoolMetrics();
        expect(poolMetrics.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(64);
        expect(poolMetrics.poolState.lastPoolLoad).toEqual(poolMetricsInfo.load);
    });

    it('get tasks increment on next run', () => {
        const poolMetrics = new PoolMetrics();
        expect(poolMetrics.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(64);
        poolMetrics.poolState.lastTasksIncrementCount = 52;

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 9,
                runningTasks: 12,
                pendingTasks: 21,
            },
        };
        expect(poolMetrics.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(102);
    });

    it('get tasks increment on slow processing', () => {
        const poolMetrics = new PoolMetrics();
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 9,
                runningTasks: 12,
                pendingTasks: 21,
            },
        };
        expect(poolMetrics.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(64);
        poolMetrics.poolState.lastTasksIncrementCount = 52;

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 32,
            load: {
                activeTasks: 91,
                runningTasks: 10,
                pendingTasks: 101,
            },
        };
        expect(poolMetrics.getTasksIncrementCount(poolMetricsInfo, 2)).toEqual(0);
    });
});
