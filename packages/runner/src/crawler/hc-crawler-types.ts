import { JSONLineExporterTyped } from './hc-crawler';

export interface JSONLineExporterOptions {
    file: string;
}

export interface CrawlerRequestOptions {
    url: string;
}

export interface CrawlerResult {
    options: CrawlerResultOptions;
    depth: number;
    previousUrl: string;
    response: CrawlerRequestResponse;
    links?: string[];
}

export interface CrawlerScanResult {
    baseUrl: string;
    scanUrl: string;
    depth: number;
    links?: string[];
}

export interface CrawlerRequestResponse {
    ok: boolean;
    status: number;
    url: string;
    headers: CrawlResponseHeader;
}

export interface CrawlerError {
    options: CrawlerRequestOptions;
    depth: number;
    previousUrl: string;
}

export interface CrawlResponseHeader {
    'content-type': string;
    'content-encoding': string;
}

export interface CrawlerResultOptions {
    maxDepth: number;
    priority: number;
    delay: number;
    retryCount: number;
    retryDelay: number;
    timeout: number;
    skipDuplicates: boolean;
    depthPriority: boolean;
    obeyRobotsTxt: boolean;
    followSitemapXml: boolean;
    skipRequestedRedirect: boolean;
    url: string;
}

export interface CrawlerLaunchOptions {
    exporter?: JSONLineExporterTyped;
    maxDepth: number;
    maxConcurrency: number;
    obeyRobotsTxt: boolean;
    allowedDomains: string[];
    retryCount: number;
    scanResult: CrawlerScanResult[];
    preRequest(options: CrawlerRequestOptions): boolean;
    onSuccess(result: CrawlerResult): void;
    onError(error: CrawlerError): void;
}

export interface CrawlerConnectOptions extends CrawlerLaunchOptions {
    browserWSEndpoint?: string;
    ignoreHTTPSErrors?: boolean;
}
