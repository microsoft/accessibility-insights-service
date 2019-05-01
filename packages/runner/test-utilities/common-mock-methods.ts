import { IMock } from 'typemoq';
import { CrawlerRequestOptions, CrawlerRequestResponse, CrawlerResult } from '../src/crawler/hc-crawler-types';

export function getNotAllowedUrls(): string[] {
    return [
        'https://www.bing.com/abc.pdf',
        'https://www.bing.com/abc.js',
        'https://www.bing.com/abc.css',
        'https://www.bing.com/abc.png',
        'https://www.bing.com/abc.jpg',
        'https://www.bing.com/abc.jpeg',
        'https://www.bing.com/abc.gif',
        'https://www.bing.com/abc.json',
        'https://www.bing.com/abc.xml',
        'https://www.bing.com/abc.exe',
        'https://www.bing.com/abc.dmg',
        'https://www.bing.com/abc.ico',
        'https://www.bing.com/abc.txt',
        'https://www.bing.com/abc.zip',
        'https://www.bing.com/abc.war',
        'https://www.bing.com/abc.rar',
        'https://www.bing.com/abc.svg',
    ];
}

export function createCrawlerRequestOptions(requestUrl: string): CrawlerRequestOptions {
    return {
        url: requestUrl,
    };
}

export function getPromisableDynamicMock<T>(mock: IMock<T>): IMock<T> {
    // workaround for issue https://github.com/florinn/typemoq/issues/70

    // tslint:disable-next-line:no-any no-unsafe-any
    mock.setup((x: any) => x.then).returns(() => undefined);

    return mock;
}

export function createCrawlResult(requestUrl: string): CrawlerResult {
    return {
        depth: 1,
        options: {
            url: requestUrl,
            maxDepth: 1,
            priority: 1,
            delay: 0,
            retryCount: 1,
            retryDelay: 0,
            timeout: 0,
            skipDuplicates: true,
            depthPriority: false,
            obeyRobotsTxt: false,
            followSitemapXml: false,
            skipRequestedRedirect: true,
        },
        previousUrl: undefined,
        response: createCrawlerRequestResponse(requestUrl),
        links: [],
    };
}

export function createCrawlerRequestResponse(requestUrl: string): CrawlerRequestResponse {
    return { ok: true, status: 200, url: requestUrl, headers: undefined };
}
