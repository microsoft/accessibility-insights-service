// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class BatchMetrics {
    public readonly taskProcessingRatio: number;

    // Azure Batch obtains samples every 30 seconds
    private readonly batchSamplingIntervalPerMinute = 2;
    private readonly samplePercentThreshold = 70;

    public constructor(private readonly batchMetricsResult: BatchMetricsResult) {
        this.taskProcessingRatio = this.getTaskProcessingRatio();
    }

    public getPendingTasksForProcessingRatio(taskProcessingRatio: number): number {
        if (this.taskProcessingRatio === -1) {
            return -1;
        }

        const runningTasksAvg = this.getAverage(this.batchMetricsResult.runningTasksVector);

        return runningTasksAvg / taskProcessingRatio;
    }

    private getTaskProcessingRatio(): number {
        const pendingTasksSamplePercent = this.getSamplePercent(this.batchMetricsResult.pendingTasksVector);
        const runningTasksSamplePercent = this.getSamplePercent(this.batchMetricsResult.runningTasksVector);
        if (pendingTasksSamplePercent < this.samplePercentThreshold || runningTasksSamplePercent < this.samplePercentThreshold) {
            return -1;
        }

        const pendingTasksAvg = this.getAverage(this.batchMetricsResult.pendingTasksVector);
        if (pendingTasksAvg === 0) {
            return -1;
        }

        const runningTasksAvg = this.getAverage(this.batchMetricsResult.runningTasksVector);

        return runningTasksAvg / pendingTasksAvg;
    }

    private getAverage(sampleVector: number[]): number {
        const sum = sampleVector.reduce((a, b) => a + b);

        return sum / sampleVector.length;
    }

    private getSamplePercent(sampleVector: number[]): number {
        return (sampleVector.length * 100) / (this.batchMetricsResult.timeIntervalInMinutes * this.batchSamplingIntervalPerMinute);
    }
}

export interface BatchMetricsResult {
    /**
     * The ID of the pool on which metrics were collected.
     */
    poolId: string;

    /**
     * The time interval for data sampling.
     */
    timeIntervalInMinutes: number;

    /**
     * The sample data for pending tasks (the sum of active and running tasks).
     */
    pendingTasksVector: number[];

    /**
     * The sample data for running tasks.
     */
    runningTasksVector: number[];
}
