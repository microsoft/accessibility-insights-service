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

export interface CrawlerRequestResponse {
    ok: boolean;
    status: number;
    url: string;
    headers: CrawlResponseHeader;
}

export interface HCCrawlerError {
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
    jQuery: boolean;
    skipDuplicates: boolean;
    depthPriority: boolean;
    obeyRobotsTxt: boolean;
    followSitemapXml: boolean;
    skipRequestedRedirect: boolean;
    url: string;
}

export interface CrawlerLaunchOptions {
    maxDepth: number;
    maxConcurrency: number;
    obeyRobotsTxt: boolean;
    allowedDomains: string[];
    retryCount: number;
    preRequest(options: CrawlerRequestOptions): boolean;
    onSuccess(result: CrawlerResult): void;
    onError(error: HCCrawlerError): void;
}
