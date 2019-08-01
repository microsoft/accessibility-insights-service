// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { JobManagerConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';

export interface PoolLoad {
    activeTasks: number;
    runningTasks: number;
}

export interface PoolMetricsInfo {
    id: string;
    maxTasksPerPool: number;
    load: PoolLoad;
}

export interface PoolMetricsState {
    poolLoad: PoolLoad;
    tasksIncrementCount: number;
    processingSpeed: number;
    activeToRunningTasksRatio: number;
    samplingIntervalInSeconds: number;
    timestamp: number;
}

@injectable()
export class PoolLoadGenerator {
    private lastPoolState: PoolMetricsState;

    public constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {
        this.lastPoolState = {
            poolLoad: {
                activeTasks: 0,
                runningTasks: 0,
            },
            tasksIncrementCount: 0,
            processingSpeed: 0,
            activeToRunningTasksRatio: undefined,
            samplingIntervalInSeconds: 1,
            timestamp: process.hrtime()[0],
        };
    }

    public get processingSpeedPerMinute(): number {
        return Math.round((60 / this.lastPoolState.samplingIntervalInSeconds) * this.lastPoolState.processingSpeed);
    }

    public get samplingIntervalInSeconds(): number {
        return this.lastPoolState.samplingIntervalInSeconds;
    }

    public get activeToRunningTasksRatio(): number {
        return this.lastPoolState.activeToRunningTasksRatio;
    }

    public setLastTasksIncrementCount(lastTasksIncrementCount: number): void {
        this.lastPoolState.tasksIncrementCount = lastTasksIncrementCount;
    }

    public async getTasksIncrementCount(poolMetricsInfo: PoolMetricsInfo): Promise<number> {
        // No last pool state is available. Use maximum pool capacity multiplied by active to running tasks ratio tasks increment value.
        if (this.lastPoolState.activeToRunningTasksRatio === undefined) {
            this.lastPoolState.activeToRunningTasksRatio = (await this.getJobManagerConfig()).activeToRunningTasksRatio;
            this.lastPoolState.poolLoad = poolMetricsInfo.load;
            this.lastPoolState.tasksIncrementCount =
                poolMetricsInfo.maxTasksPerPool * this.lastPoolState.activeToRunningTasksRatio - poolMetricsInfo.load.activeTasks;

            return this.lastPoolState.tasksIncrementCount;
        }

        // Calculate processing speed since last state
        const processingSpeed =
            this.lastPoolState.tasksIncrementCount + this.lastPoolState.poolLoad.activeTasks - poolMetricsInfo.load.activeTasks;

        // Adapt the initially provided ratio value in case when pool processing speed
        // is faster than requested active to running tasks ratio.
        const activeToRunningTasksRatio =
            poolMetricsInfo.load.activeTasks === 0 && this.lastPoolState.tasksIncrementCount > 0
                ? this.lastPoolState.activeToRunningTasksRatio + 1
                : this.lastPoolState.activeToRunningTasksRatio;

        // Increase the active tasks count up-to maximum pool capacity multiplied by
        // target active to running tasks ratio and add half of speed processing tasks count.
        // This will ensure that the average active tasks count is close to the maximum pool capacity
        // multiplied by active to running tasks ratio.
        let tasksIncrementCount =
            poolMetricsInfo.maxTasksPerPool * activeToRunningTasksRatio - poolMetricsInfo.load.activeTasks + Math.ceil(processingSpeed / 2);
        tasksIncrementCount = tasksIncrementCount > 0 ? tasksIncrementCount : 0;

        this.lastPoolState = {
            poolLoad: poolMetricsInfo.load,
            tasksIncrementCount: tasksIncrementCount,
            processingSpeed: processingSpeed,
            activeToRunningTasksRatio: activeToRunningTasksRatio,
            samplingIntervalInSeconds: process.hrtime()[0] - this.lastPoolState.timestamp,
            timestamp: process.hrtime()[0],
        };

        return tasksIncrementCount;
    }

    private async getJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }
}
