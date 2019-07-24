// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchMetrics, BatchMetricsResult } from './batch-metrics';

let batchMetricsResult: BatchMetricsResult;

describe('BatchMetrics', () => {
    beforeEach(() => {
        batchMetricsResult = {
            poolId: 'poolId',
            timeIntervalInMinutes: 3,
            pendingTasksVector: [],
            runningTasksVector: [],
        };
    });

    it('get tasks processing ratio with complete metrics', () => {
        batchMetricsResult.pendingTasksVector = [5, 5, 5, 5, 5, 5];
        batchMetricsResult.runningTasksVector = [2, 2, 2, 2, 2, 2];
        const batchMetrics = new BatchMetrics(batchMetricsResult);
        expect(batchMetrics.taskProcessingRatio).toEqual(0.4);
    });

    it('get tasks processing ratio with incomplete metrics', () => {
        batchMetricsResult.pendingTasksVector = [5, 5, 5];
        batchMetricsResult.runningTasksVector = [2, 2, 2];
        const batchMetrics = new BatchMetrics(batchMetricsResult);
        expect(batchMetrics.taskProcessingRatio).toEqual(-1);
    });

    it('get tasks processing ratio with empty metrics', () => {
        batchMetricsResult.pendingTasksVector = [0, 0, 0, 0, 0, 0];
        batchMetricsResult.runningTasksVector = [0, 0, 0, 0, 0, 0];
        const batchMetrics = new BatchMetrics(batchMetricsResult);
        expect(batchMetrics.taskProcessingRatio).toEqual(-1);
    });

    it('get pending tasks for processing ratio with empty metrics', () => {
        batchMetricsResult.pendingTasksVector = [0, 0, 0, 0, 0, 0];
        batchMetricsResult.runningTasksVector = [0, 0, 0, 0, 0, 0];
        const batchMetrics = new BatchMetrics(batchMetricsResult);
        const tasksCount = batchMetrics.getPendingTasksForProcessingRatio(0.5);
        expect(tasksCount).toEqual(-1);
    });

    it('get pending tasks for processing ratio with complete metrics', () => {
        batchMetricsResult.pendingTasksVector = [5, 5, 5, 5, 5, 5];
        batchMetricsResult.runningTasksVector = [2, 2, 2, 2, 2, 2];
        const batchMetrics = new BatchMetrics(batchMetricsResult);
        const tasksCount = batchMetrics.getPendingTasksForProcessingRatio(0.5);
        expect(tasksCount).toEqual(4);
    });
});
