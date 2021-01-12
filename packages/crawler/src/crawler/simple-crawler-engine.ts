// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
// @ts-ignore
import * as cheerio from 'cheerio';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { CrawlerEngine } from './crawler-engine';

@injectable()
export class SimpleCrawlerEngine implements CrawlerEngine<string[]> {
    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<string[]> {
        return [];
    }
}
