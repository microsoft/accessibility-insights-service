// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type LoggerEvent =
    | 'HealthCheck'
    | 'FunctionalTest'
    | 'BatchPoolStats'
    | 'ScanRequestReceived'
    | 'ScanRequestAccepted'
    | 'ScanRequestQueued'
    | 'ScanRequestRunning'
    | 'ScanRequestCompleted'
    | 'ScanRequestFailed'
    | 'ScanRequestNotificationStarted'
    | 'ScanRequestNotificationCompleted'
    | 'ScanRequestNotificationFailed'
    | 'ScanTaskStarted'
    | 'ScanTaskCompleted'
    | 'ScanTaskFailed'
    | 'SendNotificationTaskStarted'
    | 'SendNotificationTaskCompleted'
    | 'SendNotificationTaskFailed'
    | 'BrowserScanFailed';
