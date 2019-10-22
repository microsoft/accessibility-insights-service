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
    maxParallelTasksPossible: number;
}

export interface ScanTaskStartedMeasurements extends BaseTelemetryMeasurements {
    scanWaitTime: number;
    scanTaskStartTime: number;
}

export interface ScanTaskCompletedMeasurements extends BaseTelemetryMeasurements {
    scanCompleteTime: number;
    scanExecutionTime: number;
    endToEndRunTime: number;
}
