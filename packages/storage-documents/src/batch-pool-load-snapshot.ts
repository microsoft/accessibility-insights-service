// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from './storage-document';

export interface BatchPoolLoadSnapshot extends StorageDocument {
    batchAccountName: string;
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
