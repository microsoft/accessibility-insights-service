export interface HCCrawlerRequestOptions {
    url: string;
}

export interface HCCrawlerResult {
    options: HCCrawlerResultOptions;
    depth: number;
    previousUrl: string;
    response: HCCrawlerRequestResponse;
    links?: string[];
}

export interface HCCrawlerRequestResponse {
    ok: boolean;
    status: number;
    url: string;
    headers: HCResponseHeader;
}

export interface HCCrawlerError {
    options: HCCrawlerRequestOptions;
    depth: number;
    previousUrl: string;
}

export interface HCResponseHeader {
    'content-type': string;
    'content-encoding': string;
}

export interface HCCrawlerResultOptions {
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

export interface HCCrawlerLaunchOptions {
    maxDepth: number;
    maxConcurrency: number;
    obeyRobotsTxt: boolean;
    allowedDomains: string[];
    retryCount: number;
    preRequest(options: HCCrawlerRequestOptions): boolean;
    onSuccess(result: HCCrawlerResult): void;
    onError(error: HCCrawlerError): void;
}
