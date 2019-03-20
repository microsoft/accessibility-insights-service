interface RunnerRequest {
    id: string;
    name: string;
    baseUrl: string;
    scanUrl: string;
    depth: number;
    serviceTreeId: string;
}

interface CrawlerResult {
    baseUrl: string;
    scanUrl: string;
    depth: number;
    links?: string[];
}

interface RunnerContext {
    browser?: import('puppeteer').Browser;
    request?: RunnerRequest;
    crawlerResult?: CrawlerResult[];
    scanResult?: import('axe-core').AxeResults;
}
