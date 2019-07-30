// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

export interface PoolLoad {
    activeTasks: number;
    runningTasks: number;
    pendingTasks: number;
}

export interface PoolMetricsInfo {
    id: string;
    maxTasksPerPool: number;
    load: PoolLoad;
}

export interface PoolMetricsState {
    lastPoolLoad?: PoolLoad;
    lastTasksIncrementCount?: number;
    processingSpeed?: number;
}

@injectable()
export class PoolMetrics {
    public readonly poolState: PoolMetricsState = {};

    public getTasksIncrementCount(poolMetricsInfo: PoolMetricsInfo, targetQueuedTasksOverloadRatio: number): number {
        // No last pool state available. Use default task increment count.
        if (this.poolState.lastTasksIncrementCount === undefined) {
            this.poolState.lastPoolLoad = poolMetricsInfo.load;
            this.poolState.processingSpeed = 0;
            this.poolState.lastTasksIncrementCount = poolMetricsInfo.maxTasksPerPool * targetQueuedTasksOverloadRatio;

            return this.poolState.lastTasksIncrementCount;
        }

        // Calculate processing speed since last tasks increment.
        this.poolState.processingSpeed =
            this.poolState.lastTasksIncrementCount - (poolMetricsInfo.load.activeTasks - this.poolState.lastPoolLoad.activeTasks);
        // Calculate target tasks increment count to support requested load
        this.poolState.lastTasksIncrementCount =
            poolMetricsInfo.maxTasksPerPool * targetQueuedTasksOverloadRatio -
            poolMetricsInfo.load.activeTasks +
            this.poolState.processingSpeed;
        // Normalize tasks increment count
        this.poolState.lastTasksIncrementCount = this.poolState.lastTasksIncrementCount > 0 ? this.poolState.lastTasksIncrementCount : 0;
        // Presrve last pool load state
        this.poolState.lastPoolLoad = poolMetricsInfo.load;

        return this.poolState.lastTasksIncrementCount;
    }
}
