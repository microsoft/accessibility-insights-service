// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { JobManagerConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import * as moment from 'moment';

export interface PoolLoad {
    activeTasks: number;
    runningTasks: number;
}

export interface PoolMetricsInfo {
    id: string;
    maxTasksPerPool: number;
    load: PoolLoad;
}

export interface PoolLoadSnapshot {
    poolId: string;
    activeTasks: number;
    runningTasks: number;
    tasksProcessingSpeedPerInterval: number;
    tasksProcessingSpeedPerMinute: number;
    tasksIncrementCountPerInterval: number;
    targetActiveToRunningTasksRatio: number;
    configuredMaxTasksPerPool: number;
    samplingIntervalInSeconds: number;
    timestamp: Date;
}

@injectable()
export class PoolLoadGenerator {
    private samplingIntervalInSeconds = 1;
    private activeToRunningTasksRatio: number;
    private defaultActiveToRunningTasksRatio: number;
    private lastPoolLoad: PoolLoad;
    private lastTasksIncrementCount: number;
    private processingSpeed = 0;
    private timestamp: number;

    public constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    public async getPoolLoadSnapshot(poolMetricsInfo: PoolMetricsInfo): Promise<PoolLoadSnapshot> {
        await this.calculateTasksIncrementCount(poolMetricsInfo);
        this.lastPoolLoad = poolMetricsInfo.load;

        return {
            poolId: poolMetricsInfo.id,
            tasksProcessingSpeedPerInterval: this.processingSpeed,
            tasksProcessingSpeedPerMinute: Math.round((60 / this.samplingIntervalInSeconds) * this.processingSpeed),
            activeTasks: poolMetricsInfo.load.activeTasks,
            runningTasks: poolMetricsInfo.load.runningTasks,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            tasksIncrementCountPerInterval: this.lastTasksIncrementCount,
            targetActiveToRunningTasksRatio: this.activeToRunningTasksRatio,
            samplingIntervalInSeconds: this.samplingIntervalInSeconds,
            timestamp: moment().toDate(),
        };
    }

    public setLastTasksIncrementCount(lastTasksIncrementCount: number): void {
        this.lastTasksIncrementCount = lastTasksIncrementCount;
    }

    private async calculateTasksIncrementCount(poolMetricsInfo: PoolMetricsInfo): Promise<void> {
        if (this.lastTasksIncrementCount === undefined) {
            await this.calculateInitialTaskIncrementCount(poolMetricsInfo);

            return;
        }

        this.processingSpeed = this.lastTasksIncrementCount + this.lastPoolLoad.activeTasks - poolMetricsInfo.load.activeTasks;
        this.setActiveToRunningTasksRatio(poolMetricsInfo.load.activeTasks, poolMetricsInfo.maxTasksPerPool);

        const tasksIncrementCount =
            poolMetricsInfo.maxTasksPerPool * this.activeToRunningTasksRatio -
            poolMetricsInfo.load.activeTasks +
            Math.ceil(this.processingSpeed / 2);
        this.lastTasksIncrementCount = tasksIncrementCount > 0 ? tasksIncrementCount : 0;

        this.samplingIntervalInSeconds = process.hrtime()[0] - this.timestamp;
        this.timestamp = process.hrtime()[0];
    }

    private setActiveToRunningTasksRatio(activeTasks: number, maxTasksPerPool: number): void {
        if (activeTasks === 0 && this.lastTasksIncrementCount > 0) {
            this.activeToRunningTasksRatio += 1;
        } else if (maxTasksPerPool * (this.activeToRunningTasksRatio + 1) < activeTasks) {
            this.activeToRunningTasksRatio = this.defaultActiveToRunningTasksRatio;
        }
    }

    private async calculateInitialTaskIncrementCount(poolMetricsInfo: PoolMetricsInfo): Promise<void> {
        const configActiveToRunningTasksRatio = (await this.getJobManagerConfig()).activeToRunningTasksRatio;

        this.lastTasksIncrementCount = poolMetricsInfo.maxTasksPerPool * configActiveToRunningTasksRatio - poolMetricsInfo.load.activeTasks;

        this.defaultActiveToRunningTasksRatio = configActiveToRunningTasksRatio;
        this.activeToRunningTasksRatio = configActiveToRunningTasksRatio;
        this.timestamp = process.hrtime()[0];
    }

    private async getJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }
}
