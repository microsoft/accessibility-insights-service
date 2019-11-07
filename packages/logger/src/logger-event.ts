// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type LoggerEvent =
    | 'HealthCheck'
    | 'BatchScanRequestSubmitted'
    | 'BatchPoolStats'
    | 'ScanRequestsAccepted'
    | 'ScanRequestQueued'
    | 'ScanTaskStarted'
    | 'ScanTaskCompleted'
    | 'ScanTaskSucceeded'
    | 'ScanTaskFailed';
