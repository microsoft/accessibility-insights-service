// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type LoggerEvent =
    | 'HealthCheck'
    | 'ScanRequestReceived'
    | 'BatchPoolStats'
    | 'ScanRequestsAccepted'
    | 'ScanRequestQueued'
    | 'ScanRequestRunning'
    | 'ScanRequestCompleted'
    | 'ScanRequestFailed'
    | 'ScanRequestNotificationSucceeded'
    | 'ScanRequestNotificationFailed'
    | 'ScanTaskStarted'
    | 'ScanTaskCompleted'
    | 'ScanTaskSucceeded'
    | 'ScanTaskFailed'
    | 'FunctionalTest'
    | 'SendNotificationTaskStarted'
    | 'SendNotificationTaskCompleted'
    | 'SendNotificationTaskFailed'
    | 'SendNotificationTaskSucceeded';
