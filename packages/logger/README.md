<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# Telemetry information

### Events

All event names are defined in src/logger-event.ts

-   **HealthCheck:** Sent each time check-health-func runs
-   **BatchPoolStats:** Sent by Batch job manager. Custom measurements:
    -   runningTasks: number of running tasks
    -   samplingIntervalInSeconds: the time interval to take pool metrics measurement
    -   maxParallelTasks: the pool configured maximum number of parallel tasks to run
-   **ScanRequestReceived:** Sent when a request is received by post-scans-func. Custom measurements:
    -   totalScanRequests
    -   pendingScanRequests
    -   rejectedScanRequests
-   **ScanRequestAccepted:** Sent by web-worker each time a received request is processed and split into multiple separate scan requests. Custom measurements:
    -   acceptedScanRequests: number of scans that were accepted for the processing
-   **ScanRequestQueued:** Sent when a scan request is queued for processing by Batch scan task. Custom measurements:
    -   queuedScanRequests: number of requests that were queued
-   **ScanRequestRunning** Sent when a scan request is processing by Batch scan task. Custom measurements:
    -   runningScanRequests: number of running scan requests
-   **ScanRequestCompleted** Sent when a scan request completed, regardless of the operation result. Custom measurements:
    -   completedScanRequests: number of scan requests completed
-   **ScanRequestFailed** Sent when a scan request failed. Custom measurements:
    -   failedScanRequests: number of scan requests failed
-   **ScanRequestNotificationStarted** Sent when a scan result notification request started. Custom measurements:
    -   scanRequestNotificationsStarted: number of scan result notification requests started
-   **ScanRequestNotificationCompleted** Sent when a scan result notification request completed, regardless of the operation result. Custom measurements:
    -   scanRequestNotificationsCompleted: number of scan result notification requests completed
-   **ScanRequestNotificationFailed** Sent when a scan result notification request failed. Custom measurements:
    -   scanRequestNotificationsFailed: number of scan result notification requests failed
-   **ScanTaskStarted:** Sent when a scan begins executing. Custom measurements:
    -   scanWaitTime: number of seconds between when the original scan request was received and when the scan begins executing
    -   startedScanTasks: number of scan tasks started
-   **ScanTaskCompleted:** Sent when a scan completed, regardless of the operation result. Custom measurements:
    -   scanExecutionTime: number of seconds between when the scan began executing (when scanTaskStarted was sent) and when the scan completed
    -   scanTotalTime: number of seconds between when the original scan request was received and when the scan completed (equal to scanExecutionTime + scanWaitTime)
    -   completedScanTasks: number of scan tasks completed
-   **ScanTaskFailed:** Sent when a scan task failed. Custom measurements:
    -   failedScanTasks: number of scan tasks failed
