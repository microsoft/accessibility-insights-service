export enum RunState {
    completed = 'completed',
    failed = 'failed',
}

export enum ScanResultLevel {
    pass = 'pass',
    fail = 'fail',
}

export interface ScanResult {
    runTime: string;
    level: ScanResultLevel;
    issues: string[];
}

export interface CrawlResult {
    runTime: string;
    links: string[];
}

export interface RunResult {
    runTime: string;
    state: RunState;
    error?: string;
}

export interface Result<T> {
    result?: T;
    run: RunResult;
}

export interface PageScanResult {
    id: string;
    websiteId: string;
    url: string;
    crawl: Result<CrawlResult>;
    scan: Result<ScanResult>;
}
