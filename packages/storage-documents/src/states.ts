// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export enum ScanLevel {
    /**
     * The scan completed and has no issue(s).
     */
    pass = 'pass',

    /**
     * The scan completed and has some issue(s).
     */
    fail = 'fail',
}

export enum RunState {
    /**
     * Indicates that run request was queued.
     */
    queued = 'queued',

    /**
     * Indicates that request is currently in run state.
     */
    running = 'running',

    /**
     * Indicates that run completed successfully.
     */
    completed = 'completed',

    /**
     * Indicates that run has failed.
     */
    failed = 'failed',
}

export enum ResultLevel {
    /**
     * Indicates that rule validation returned an error result.
     */
    error = 'error',

    /**
     * Indicates that rule validation returned a pass result.
     */
    pass = 'pass',
}

export enum WebsiteScanState {
    /**
     * Indicates that scan execution completed successfully.
     */
    completed = 'completed',

    /**
     * Indicates that scan execution completed with error.
     */
    completedWithError = 'completedWithError',
}
