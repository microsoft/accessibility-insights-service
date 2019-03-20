export enum RunState {
    ready = 'ready',
    completed = 'completed',
    failed = 'failed',
}

export enum ScanResultLevel {
    pass = 'pass',
    fail = 'fail',
}

export interface ScanResult {
    lastRunTime: string;
    level: ScanResultLevel;
    issues: string[];
}

export interface RunResult {
    lastRunTime: string;
    state: RunState;
    error?: string;
}

export interface PageScanResult {
    id: string;
    websiteId: string;
    url: string;
    depth: number;
    scan: {
        result?: ScanResult;
        run: RunResult;
    };
}
