// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable-next-line: no-empty-interface
export interface BaseTelemetryMeasurements {
    [name: string]: number;
}

export interface BatchScanRequestMeasurements extends BaseTelemetryMeasurements {
    totalScanRequests: number;
    acceptedScanRequests: number;
    rejectedScanRequests: number;
}

export interface BatchPoolMeasurements extends BaseTelemetryMeasurements {
    runningTasks: number;
    samplingIntervalInSeconds: number;
    maxParallelTasks: number;
}

export interface ScanTaskStartedMeasurements extends BaseTelemetryMeasurements {
    scanWaitTime: number;
}

export interface ScanTaskCompletedMeasurements extends BaseTelemetryMeasurements {
    scanExecutionTime: number;
    scanWallClockTime: number;
}

export type TelemetryMeasurements = {
    HealthCheck: null;
    ScanRequestSubmitted: null;
    ScanTasksQueued: BatchPoolMeasurements;
    BatchScanRequestSubmitted: BatchScanRequestMeasurements;
    ScanTaskStarted: ScanTaskStartedMeasurements;
    ScanTaskCompleted: ScanTaskCompletedMeasurements;
    ScanTaskSucceeded: null;
    ScanTaskFailed: null;
};
