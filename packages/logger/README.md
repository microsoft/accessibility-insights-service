<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# Telemetry information

### Events

All event names are defined in src/logger-event.ts

-   **HealthCheck:** sent each time check-health-func runs
-   **BatchScanRequestSubmitted:** sent during a request to post-scans-func. Contains custom measurements:
    -   totalScanRequests
    -   acceptedScanRequests
    -   rejectedScanRequests
-   **BatchPoolStats:** Sent by job manager. Contains custom measurements to report different batch pool stats:
    -   runningTasks
    -   samplingIntervalInSeconds
    -   maxParallelTasks
-   **ScanRequestsAccepted:** Sent by web-worker each time a batch request is processed and split into multiple seperate url scan requests. Custom measurements:
    -   addedUrls: number of urls that were accepted
-   **ScanRequestQueued:** Sent when scan requests are queued for processing. Custom measurements:
    -   queuedRequests: number of requests that were queued
-   **ScanTaskStarted:** Sent when a scan begins executing. Custom measurements:
    -   scanWaitTime: number of seconds between when the original scan request was received and when the scan begins executing
-   **ScanTaskCompleted:** Sent when a scan completes (on both success and failure). Custom measurements:
    -   scanExecutionTime: number of seconds between when the scan began executing (when scanTaskStarted was sent) and when the scan completed
    -   scanTotalTime: number of seconds between when the original scan request was received and when the scan completed (equal to scanExecutionTime + scanWaitTime)
-   **ScanTaskSucceeded:** Sent when a scan completes successfully (in addition to ScanTaskCompleted)
-   **ScanTaskFailed:** Sent when a scan fails (in addition to ScanTaskCompleted)
