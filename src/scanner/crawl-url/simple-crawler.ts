// tslint:disable-next-line:no-require-imports no-var-requires
const simpleCrawler = require('simplecrawler');

export interface QueueItem {
    path: string;
    url: string;
}
export interface SimpleCrawler {
    respectRobotsTxt: boolean;
    maxDepth: number;
    maxConcurrency: number;
    interval: number;
    initialURL: string;
    stop(): void;
    start(): void;
    addFetchCondition(callback: (queueItem: QueueItem) => void): number;
    on(eventName: string, callback: Function): number;
}

export function getCrawler(url: string): SimpleCrawler {
    return new simpleCrawler(url) as SimpleCrawler;
}
