// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface BatchScanRequestMeasurements {
    totalScanRequests: number;
    acceptedScanRequests: number;
    rejectedScanRequests: number;
}

export interface BatchPoolMeasurements {
    runningTasks: number;
    samplingIntervalInSeconds: number;
    maxParallelTasksPossible: number;
}

export interface BaseScanRequestMeasurements {
    scanId: string;
}

export interface ScanTaskStartedMeasurements extends BaseScanRequestMeasurements {
    scanWaitTime: number;
    scanTaskStartTime: number;
}

export interface ScanTaskCompletedMeasurements extends BaseScanRequestMeasurements {
    scanCompleteTime: number;
    scanExecutionTime: number;
    endToEndRunTime: number;
}
