// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Crawlee from '@crawlee/puppeteer';
import { injectable } from 'inversify';

@injectable()
export class CrawlerFactory {
    public createPuppeteerCrawler(options: Crawlee.PuppeteerCrawlerOptions): Crawlee.PuppeteerCrawler {
        return new Crawlee.PuppeteerCrawler(options);
    }

    public createBasicCrawler(options: Crawlee.BasicCrawlerOptions): Crawlee.BasicCrawler {
        return new Crawlee.BasicCrawler(options);
    }
}
