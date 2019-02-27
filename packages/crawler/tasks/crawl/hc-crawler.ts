import { HCCrawlerLaunchOptions } from './hc-crawler-types';

// tslint:disable-next-line:no-require-imports no-var-requires
const headlessChromeCrawler = require('headless-chrome-crawler');

export declare class HCCrawlerTyped {
    // tslint:disable-next-line:function-name
    public static launch(options: HCCrawlerLaunchOptions): Promise<HCCrawlerTyped>;
    public close(): Promise<void>;
    public queue(url: string): Promise<void>;
    public onIdle(): Promise<void>;
    public on(eventName: string, callback: Function): void;
    public queueSize(): number;
}

// tslint:disable-next-line:variable-name
export const HCCrawler = headlessChromeCrawler as typeof HCCrawlerTyped;

export interface ExploreRequest {
    id: string;
    name: string;
    baseUrl: string;
    serviceTreeId: string;
}
