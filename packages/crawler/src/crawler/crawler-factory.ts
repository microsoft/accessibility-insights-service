// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { injectable } from 'inversify';

@injectable()
export class CrawlerFactory {
    public constructor(private readonly apify: typeof Apify = Apify) {}

    public createPuppeteerCrawler(options: Apify.PuppeteerCrawlerOptions): Apify.PuppeteerCrawler {
        return new this.apify.PuppeteerCrawler(options);
    }

    public createBasicCrawler(options: Apify.BasicCrawlerOptions): Apify.BasicCrawler {
        return new this.apify.BasicCrawler(options);
    }
}
