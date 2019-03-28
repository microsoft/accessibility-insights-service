export enum ScanLevel {
    /** The scan completed and has no issue(s). */
    pass = 'pass',

    /** The scan completed and has some issue(s). */
    fail = 'fail',
}

export enum RunState {
    /** The page was successfully scanned. */
    completed = 'completed',

    /** An error occurred while scanning the page. */
    failed = 'failed',
}
