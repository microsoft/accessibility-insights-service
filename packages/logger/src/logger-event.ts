// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type LoggerEvent =
    | 'HealthCheck'
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
    | 'FunctionalTest'
    | 'SendNotificationTaskStarted'
    | 'SendNotificationTaskCompleted'
    | 'SendNotificationTaskFailed';
