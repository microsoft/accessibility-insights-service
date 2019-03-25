import { CrawlerScanResult } from './hc-crawler-types';

export interface CrawlerScanResults {
    results?: CrawlerScanResult[];
    error?: string;
}
