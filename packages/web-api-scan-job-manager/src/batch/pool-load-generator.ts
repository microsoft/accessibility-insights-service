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

@injectable()
export class PoolLoadGenerator {
    public samplingIntervalInSeconds = 1;
    public activeToRunningTasksRatio: number;

    private defaultActiveToRunningTasksRatio: number;
    private lastPoolLoad: PoolLoad;
    private lastTasksIncrementCount: number;
    private processingSpeed = 0;
    private timestamp: number;

    public constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    public get processingSpeedPerMinute(): number {
        return Math.round((60 / this.samplingIntervalInSeconds) * this.processingSpeed);
    }

    public setLastTasksIncrementCount(lastTasksIncrementCount: number): void {
        this.lastTasksIncrementCount = lastTasksIncrementCount;
    }

    public async getTasksIncrementCount(poolMetricsInfo: PoolMetricsInfo): Promise<number> {
        if (this.lastTasksIncrementCount === undefined) {
            return this.getInitialTaskIncrementCount(poolMetricsInfo);
        }

        this.processingSpeed = this.lastTasksIncrementCount + this.lastPoolLoad.activeTasks - poolMetricsInfo.load.activeTasks;
        this.setActiveToRunningTasksRatio(poolMetricsInfo.load.activeTasks, poolMetricsInfo.maxTasksPerPool);

        let tasksIncrementCount =
            poolMetricsInfo.maxTasksPerPool * this.activeToRunningTasksRatio -
            poolMetricsInfo.load.activeTasks +
            Math.ceil(this.processingSpeed / 2);
        tasksIncrementCount = tasksIncrementCount > 0 ? tasksIncrementCount : 0;

        this.lastPoolLoad = poolMetricsInfo.load;
        this.lastTasksIncrementCount = tasksIncrementCount;
        this.samplingIntervalInSeconds = process.hrtime()[0] - this.timestamp;
        this.timestamp = process.hrtime()[0];

        return tasksIncrementCount;
    }

    private setActiveToRunningTasksRatio(activeTasks: number, maxTasksPerPool: number): void {
        if (activeTasks === 0 && this.lastTasksIncrementCount > 0) {
            this.activeToRunningTasksRatio += 1;
        } else if (maxTasksPerPool * (this.activeToRunningTasksRatio + 1) < activeTasks) {
            this.activeToRunningTasksRatio = this.defaultActiveToRunningTasksRatio;
        }
    }

    private async getInitialTaskIncrementCount(poolMetricsInfo: PoolMetricsInfo): Promise<number> {
        const configActiveToRunningTasksRatio = (await this.getJobManagerConfig()).activeToRunningTasksRatio;

        this.lastTasksIncrementCount = poolMetricsInfo.maxTasksPerPool * configActiveToRunningTasksRatio - poolMetricsInfo.load.activeTasks;

        this.defaultActiveToRunningTasksRatio = configActiveToRunningTasksRatio;
        this.activeToRunningTasksRatio = configActiveToRunningTasksRatio;
        this.lastPoolLoad = poolMetricsInfo.load;
        this.timestamp = process.hrtime()[0];

        return this.lastTasksIncrementCount;
    }

    private async getJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }
}
