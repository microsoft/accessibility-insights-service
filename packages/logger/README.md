<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# Telemetry information

### Events

All event names are defined in src/logger-event.ts

-   **HealthCheck:** Sent each time check-health-func runs
-   **BatchPoolStats:** Sent by batch job manager. Custom measurements:
    -   runningTasks: number of running tasks
    -   samplingIntervalInSeconds: the time interval to take pool metrics measurement
    -   maxParallelTasks: the pool configured maximum number of parallel tasks to run
-   **ScanRequestReceived:** Sent when requests received by post-scans-func. Custom measurements:
    -   totalScanRequests
    -   pendingScanRequests
    -   rejectedScanRequests
-   **ScanRequestAccepted:** Sent by web-worker each time a batch request is processed and split into multiple separate url scan requests. Custom measurements:
    -   acceptedScanRequests: number of scans that were accepted for the processing
-   **ScanRequestQueued:** Sent when scan requests are queued for processing. Custom measurements:
    -   queuedScanRequests: number of requests that were queued
-   **ScanRequestRunning** Sent when scan request is processing by batch run task. Custom measurements:
    -   runningScanRequests: number of running scan requests
-   **ScanRequestCompleted** Sent when scan request successfully completed. Custom measurements:
    -   completedScanRequests: number of scan requests successfully completed
-   **ScanRequestFailed** Sent when scan request fail to complete. Custom measurements:
    -   failedScanRequests: number of scan requests fail to completed
-   **ScanRequestNotificationCompleted** Sent when scan result notification request completed. Custom measurements:
    -   scanRequestNotificationsCompleted: number of scan result notification request completed
-   **ScanRequestNotificationFailed** Sent when scan result notification request failed. Custom measurements:
    -   scanRequestNotificationsFailed: number of scan result notification request failed
-   **ScanTaskStarted:** Sent when a scan begins executing. Custom measurements:
    -   scanWaitTime: number of seconds between when the original scan request was received and when the scan begins executing
    -   startedScanTasks: number of scan task started
-   **ScanTaskCompleted:** Sent when a scan completes (on both success and failure). Custom measurements:
    -   scanExecutionTime: number of seconds between when the scan began executing (when scanTaskStarted was sent) and when the scan completed
    -   scanTotalTime: number of seconds between when the original scan request was received and when the scan completed (equal to scanExecutionTime + scanWaitTime)
    -   completedScanTasks: number of scan task completed
-   **ScanTaskFailed:** Sent when a scan fails (in addition to ScanTaskCompleted). Custom measurements:
    -   failedScanTasks: number of scan task failed
