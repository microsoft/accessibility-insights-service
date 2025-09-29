// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type LoggerEvent =
    | 'HealthCheck'
    | 'FunctionalTest'
    | 'BatchPoolStats'
    | 'ScanRequestReceived'
    | 'ScanRequestAccepted'
    | 'ScanRequestQueued'
    | 'ScanRequestScheduled'
    | 'ScanRequestSchedulingFailed'
    | 'ScanRequestRunning'
    | 'ScanRequestCompleted'
    | 'ScanRequestFailed'
    | 'ScanTaskStarted'
    | 'ScanTaskCompleted'
    | 'ScanTaskFailed'
    | 'BrowserScanFailed'
    | 'ReportGeneratorTaskStarted'
    | 'ReportGeneratorTaskFailed'
    | 'ReportGeneratorTaskCompleted'
    | 'ReportGeneratorRequestRunning'
    | 'ReportGeneratorRequestFailed'
    | 'ReportGeneratorRequestCompleted';
