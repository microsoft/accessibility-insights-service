// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable-next-line: no-empty-interface
export interface BaseTelemetryMeasurements {
    [name: string]: number;
}

export interface ScanRequestReceivedMeasurements extends BaseTelemetryMeasurements {
    totalScanRequests: number;
    pendingScanRequests: number;
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
    scanTotalTime: number;
}

export interface ScanRequestAcceptedMeasurements extends BaseTelemetryMeasurements {
    acceptedScanRequests: number;
}

export interface ScanRequestQueuedMeasurements extends BaseTelemetryMeasurements {
    queuedScanRequests: number;
}

export interface ScanRequestRunningMeasurements extends BaseTelemetryMeasurements {
    runningScanRequests: number;
}

export interface ScanRequestCompletedMeasurements extends BaseTelemetryMeasurements {
    completedScanRequests: number;
}

export interface ScanRequestFailedMeasurements extends BaseTelemetryMeasurements {
    failedScanRequests: number;
}

export interface ScanRequestNotificationSucceededMeasurements extends BaseTelemetryMeasurements {
    scanRequestNotificationsSucceeded: number;
}

export interface ScanRequestNotificationFailedMeasurements extends BaseTelemetryMeasurements {
    scanRequestNotificationsFailed: number;
}

export type TelemetryMeasurements = {
    HealthCheck: null;
    BatchPoolStats: BatchPoolMeasurements;
    ScanTaskStarted: ScanTaskStartedMeasurements;
    ScanTaskCompleted: ScanTaskCompletedMeasurements;
    ScanTaskSucceeded: null;
    ScanTaskFailed: null;
    ScanRequestReceived: ScanRequestReceivedMeasurements;
    ScanRequestsAccepted: ScanRequestAcceptedMeasurements;
    ScanRequestQueued: ScanRequestQueuedMeasurements;
    ScanRequestRunning: ScanRequestRunningMeasurements;
    ScanRequestCompleted: ScanRequestCompletedMeasurements;
    ScanRequestFailed: ScanRequestFailedMeasurements;
    ScanRequestNotificationSucceeded: ScanRequestNotificationSucceededMeasurements;
    ScanRequestNotificationFailed: ScanRequestNotificationFailedMeasurements;
    FunctionalTest: null;
    SendNotificationTaskStarted: null;
    SendNotificationTaskCompleted: null;
    SendNotificationTaskFailed: null;
    SendNotificationTaskSucceeded: null;
};
