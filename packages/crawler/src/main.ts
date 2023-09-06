// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import * as dotenv from 'dotenv';
import * as yargs from 'yargs';
import * as inversify from 'inversify';
import { Crawler } from './crawler';
import { setupCrawlerContainer } from './setup-crawler-container';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ScanArguments {
    url?: string;
    output?: string;
    maxUrls?: number;
    restart?: boolean;
    userAgent?: string;
    httpHeaders?: string;
}

/**
 * The debug entry point.
 */
(async () => {
    dotenv.config();
    const scanArguments = yargs.argv as unknown as ScanArguments;

    const container = new inversify.Container({ autoBindInjectable: true });
    setupCrawlerContainer(container);

    const crawlerRunOptions: any = {};
    Object.keys(scanArguments).forEach((key: keyof ScanArguments) => {
        if (scanArguments[key] !== undefined) {
            switch (key.toString()) {
                case 'url':
                    crawlerRunOptions.baseUrl = scanArguments.url;
                    break;
                case 'output':
                    crawlerRunOptions.localOutputDir = scanArguments.output;
                    break;
                case 'maxUrls':
                    crawlerRunOptions.maxRequestsPerCrawl = scanArguments.maxUrls;
                    break;
                case 'restart':
                    crawlerRunOptions.restartCrawl = scanArguments.restart;
                    break;
                case 'userAgent':
                    process.env.USER_AGENT = scanArguments.userAgent;
                    break;
                case 'httpHeaders':
                    crawlerRunOptions.httpHeaders = scanArguments.httpHeaders ? JSON.parse(scanArguments.httpHeaders) : undefined;
                    break;
                default:
                    crawlerRunOptions[key] = scanArguments[key];
            }
        }
    });

    await new Crawler(container).crawl(crawlerRunOptions);
})().catch((error) => {
    console.log('Exception: ', System.serializeError(error));
    process.exitCode = 1;
});
