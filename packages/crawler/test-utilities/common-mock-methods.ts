import { IMock } from 'typemoq';
import { CrawlerRequestOptions } from '../tasks/crawl/hc-crawler-types';

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
