// tslint:disable-next-line:no-require-imports no-var-requires
const simpleCrawler = require('simplecrawler');

export interface QueueItem {
    path: string;
    url: string;
}
export declare class SimpleCrawlerTyped {
    public respectRobotsTxt: boolean;
    public maxDepth: number;
    public maxConcurrency: number;
    public interval: number;
    public initialURL: string;
    constructor(url: string);
    public stop(): void;
    public start(): void;
    public addFetchCondition(callback: (queueItem: QueueItem) => void): number;
    public on(eventName: string, callback: Function): number;
}
// tslint:disable-next-line:variable-name
export const SimpleCrawler = simpleCrawler as typeof SimpleCrawlerTyped;

export interface CrawlRequest {
    id: string;
    name: string;
    baseUrl: string;
    serviceTreeId: string;
}
export interface ScanRequest {
    id: string;
    name: string;
    baseUrl: string;
    scanUrl: string;
    serviceTreeId: string;
}
