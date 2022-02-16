// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface BaseTelemetryMeasurements {
    [name: string]: number;
}

export interface BatchPoolMeasurements extends BaseTelemetryMeasurements {
    runningTasks: number;
    samplingIntervalInSeconds: number;
    maxParallelTasks: number;
}

// ScanRequest events
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

// ScanTask events
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

// SendNotificationTask events
export interface SendNotificationTaskStartedMeasurements extends BaseTelemetryMeasurements {
    startedScanNotificationTasks: number;
}

export interface SendNotificationTaskCompletedMeasurements extends BaseTelemetryMeasurements {
    completedScanNotificationTasks: number;
}

export interface SendNotificationTaskFailedMeasurements extends BaseTelemetryMeasurements {
    failedScanNotificationTasks: number;
}

export interface BrowserScanFailedMeasurements extends BaseTelemetryMeasurements {
    failedBrowserScans: number;
}

// Report generator task events
export interface ReportGeneratorTaskStartedMeasurements extends BaseTelemetryMeasurements {
    waitTime: number;
    startedTasks: number;
}

export interface ReportGeneratorTaskCompletedMeasurements extends BaseTelemetryMeasurements {
    executionTime: number;
    totalTime: number;
    completedTasks: number;
}

export interface ReportGeneratorTaskFailedMeasurements extends BaseTelemetryMeasurements {
    failedTasks: number;
}

// Report generator request run events
export interface ReportGeneratorRequestRunningMeasurements extends BaseTelemetryMeasurements {
    runningRequests: number;
}

export interface ReportGeneratorRequestCompletedMeasurements extends BaseTelemetryMeasurements {
    completedRequests: number;
}

export interface ReportGeneratorRequestFailedMeasurements extends BaseTelemetryMeasurements {
    failedRequests: number;
}

export type TelemetryMeasurements = {
    HealthCheck: null;
    FunctionalTest: null;
    BatchPoolStats: BatchPoolMeasurements;
    BrowserScanFailed: BrowserScanFailedMeasurements;

    ScanRequestReceived: ScanRequestReceivedMeasurements;
    ScanRequestAccepted: ScanRequestAcceptedMeasurements;
    ScanRequestQueued: ScanRequestQueuedMeasurements;
    ScanRequestRunning: ScanRequestRunningMeasurements;
    ScanRequestCompleted: ScanRequestCompletedMeasurements;
    ScanRequestFailed: ScanRequestFailedMeasurements;

    ScanTaskStarted: ScanTaskStartedMeasurements;
    ScanTaskCompleted: ScanTaskCompletedMeasurements;
    ScanTaskFailed: ScanTaskFailedMeasurements;

    ScanRequestNotificationStarted: ScanRequestNotificationStartedMeasurements;
    ScanRequestNotificationCompleted: ScanRequestNotificationCompletedMeasurements;
    ScanRequestNotificationFailed: ScanRequestNotificationFailedMeasurements;

    SendNotificationTaskStarted: SendNotificationTaskStartedMeasurements;
    SendNotificationTaskCompleted: SendNotificationTaskCompletedMeasurements;
    SendNotificationTaskFailed: SendNotificationTaskFailedMeasurements;

    ReportGeneratorTaskStarted: ReportGeneratorTaskStartedMeasurements;
    ReportGeneratorTaskCompleted: ReportGeneratorTaskCompletedMeasurements;
    ReportGeneratorTaskFailed: ReportGeneratorTaskFailedMeasurements;

    ReportGeneratorRequestRunning: ReportGeneratorRequestRunningMeasurements;
    ReportGeneratorRequestCompleted: ReportGeneratorRequestCompletedMeasurements;
    ReportGeneratorRequestFailed: ReportGeneratorRequestFailedMeasurements;
};
