// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from './storage-document';

export interface BatchPoolLoadSnapshot extends StorageDocument {
    batchAccountName: string;
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
