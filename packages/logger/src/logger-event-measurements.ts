// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// The measurement should include three main events by following the pattern:
//
// - Started event: This event is emitted once an operation has been started
//
// - Completed event: This event is emitted once an operation is completed, regardless of the operation success/failure state
//
// - Failed event: This event is emitted when an operation completes with a failure state
//
export interface BaseTelemetryMeasurements {
    [name: string]: number;
}

export interface BatchPoolMeasurements extends BaseTelemetryMeasurements {
    runningTasks: number;
    samplingIntervalInSeconds: number;
    maxParallelTasks: number;
}

export interface ScanTaskStartedMeasurements extends BaseTelemetryMeasurements {
    scanWaitTime: number;
    startedScanTasks: number;
}

export interface ScanTaskCompletedMeasurements extends BaseTelemetryMeasurements {
    scanExecutionTime: number;
    scanTotalTime: number;
    completedScanTasks: number;
}

export interface ScanTaskFailedMeasurements extends BaseTelemetryMeasurements {
    failedScanTasks: number;
}

export interface ScanRequestReceivedMeasurements extends BaseTelemetryMeasurements {
    totalScanRequests: number;
    pendingScanRequests: number;
    rejectedScanRequests: number;
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

export interface ScanRequestNotificationStartedMeasurements extends BaseTelemetryMeasurements {
    scanRequestNotificationsStarted: number;
}

export interface ScanRequestNotificationCompletedMeasurements extends BaseTelemetryMeasurements {
    scanRequestNotificationsCompleted: number;
}

export interface ScanRequestNotificationFailedMeasurements extends BaseTelemetryMeasurements {
    scanRequestNotificationsFailed: number;
}

export interface SendNotificationTaskStartedMeasurements extends BaseTelemetryMeasurements {
    startedScanNotificationTasks: number;
}

export interface SendNotificationTaskCompletedMeasurements extends BaseTelemetryMeasurements {
    completedScanNotificationTasks: number;
}

export interface SendNotificationTaskFailedMeasurements extends BaseTelemetryMeasurements {
    failedScanNotificationTasks: number;
}

export interface SendNotificationTaskSucceededMeasurements extends BaseTelemetryMeasurements {
    succeededScanNotificationTasks: number;
}

export type TelemetryMeasurements = {
    HealthCheck: null;
    FunctionalTest: null;
    BatchPoolStats: BatchPoolMeasurements;
    ScanTaskStarted: ScanTaskStartedMeasurements;
    ScanTaskCompleted: ScanTaskCompletedMeasurements;
    ScanTaskFailed: ScanTaskFailedMeasurements;
    ScanRequestReceived: ScanRequestReceivedMeasurements;
    ScanRequestAccepted: ScanRequestAcceptedMeasurements;
    ScanRequestQueued: ScanRequestQueuedMeasurements;
    ScanRequestRunning: ScanRequestRunningMeasurements;
    ScanRequestCompleted: ScanRequestCompletedMeasurements;
    ScanRequestFailed: ScanRequestFailedMeasurements;
    ScanRequestNotificationStarted: ScanRequestNotificationStartedMeasurements;
    ScanRequestNotificationCompleted: ScanRequestNotificationCompletedMeasurements;
    ScanRequestNotificationFailed: ScanRequestNotificationFailedMeasurements;
    SendNotificationTaskStarted: SendNotificationTaskStartedMeasurements;
    SendNotificationTaskCompleted: SendNotificationTaskCompletedMeasurements;
    SendNotificationTaskFailed: SendNotificationTaskFailedMeasurements;
};
