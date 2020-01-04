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
    isIdle: boolean;
    activeTasks?: number;
    runningTasks?: number;
    tasksProcessingSpeedPerMinute?: number;
    tasksProcessingSpeedPerInterval?: number;
    tasksIncrementCountPerInterval?: number;
    samplingIntervalInSeconds?: number;
    targetActiveToRunningTasksRatio: number;
    configuredMaxTasksPerPool: number;
    targetMaxTasksPerPool: number;
    poolFillIntervalInSeconds: number;
    /**
     * Represents the pool activity state history as a bit flag. The latest state is a rightmost bit.
     * The idle state is represented by 0, the active state is represented by 1.
     */
    activityStateFlags: number;
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
    private samplingTimestamp: number;

    public constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    public async getPoolLoadSnapshot(lastActivityStateFlags: number, poolMetricsInfo: PoolMetricsInfo): Promise<PoolLoadSnapshot> {
        await this.calculateTasksIncrementCount(poolMetricsInfo);
        this.lastPoolLoad = poolMetricsInfo.load;

        // The pool has a job manager task always running
        const isIdle = poolMetricsInfo.load.activeTasks + poolMetricsInfo.load.runningTasks <= 1;
        const idlePoolLoadSnapshot = {
            poolId: poolMetricsInfo.id,
            isIdle: isIdle,
            configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
            targetActiveToRunningTasksRatio: this.activeToRunningTasksRatio,
            targetMaxTasksPerPool: Math.round(poolMetricsInfo.maxTasksPerPool * this.activeToRunningTasksRatio),
            poolFillIntervalInSeconds: (await this.getJobManagerConfig()).addTasksIntervalInSeconds,
            activityStateFlags: this.getActivityStateFlags(lastActivityStateFlags, isIdle),
            timestamp: moment().toDate(),
        };

        if (isIdle) {
            return idlePoolLoadSnapshot;
        } else {
            return {
                ...idlePoolLoadSnapshot,
                activeTasks: poolMetricsInfo.load.activeTasks,
                runningTasks: poolMetricsInfo.load.runningTasks,
                tasksProcessingSpeedPerInterval: this.processingSpeed,
                tasksProcessingSpeedPerMinute: Math.round((60 / this.samplingIntervalInSeconds) * this.processingSpeed),
                tasksIncrementCountPerInterval: this.lastTasksIncrementCount,
                samplingIntervalInSeconds: this.samplingIntervalInSeconds,
            };
        }
    }

    public setLastTasksIncrementCount(lastTasksIncrementCount: number): void {
        this.lastTasksIncrementCount = lastTasksIncrementCount;
    }

    private async calculateTasksIncrementCount(poolMetricsInfo: PoolMetricsInfo): Promise<void> {
        if (this.lastTasksIncrementCount === undefined) {
            return this.calculateInitialTaskIncrementCount(poolMetricsInfo);
        }

        this.processingSpeed = this.lastTasksIncrementCount + this.lastPoolLoad.activeTasks - poolMetricsInfo.load.activeTasks;
        this.setActiveToRunningTasksRatio(poolMetricsInfo.load.activeTasks, poolMetricsInfo.maxTasksPerPool);

        const tasksIncrementCount =
            poolMetricsInfo.maxTasksPerPool * this.activeToRunningTasksRatio -
            poolMetricsInfo.load.activeTasks +
            Math.ceil(this.processingSpeed / 2);
        this.lastTasksIncrementCount = tasksIncrementCount > 0 ? tasksIncrementCount : 0;

        this.samplingIntervalInSeconds = process.hrtime()[0] - this.samplingTimestamp;
        this.samplingTimestamp = process.hrtime()[0];
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
        this.samplingTimestamp = process.hrtime()[0];
    }

    private async getJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }

    // tslint:disable: no-bitwise
    private getActivityStateFlags(lastActivityStateFlags: number, isIdle: boolean): number {
        const mask = 2147483647;
        // shift previous states left and reset sign bit
        const nextState = (lastActivityStateFlags << 1) & mask;

        // set current state bit to 0/1 for idle/active pool respectively
        return isIdle ? nextState : nextState + 1;
    }
}
