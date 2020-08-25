// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-import-side-effect no-require-imports no-var-requires
require = require('esm')(module); // support ES6 module syntax for Office Fabric package

import 'reflect-metadata';

export { CrawlerEngine } from './crawler/crawler-engine';
export { CrawlerRunOptions } from './types/run-options';

import { System } from 'common';
import * as dotenv from 'dotenv';
import * as yargs from 'yargs';
import { CrawlerEntryPoint } from './crawler-entry-point';
import { setupCrawlerContainer } from './setup-crawler-container';

interface Arguments {
    url: string;
    simulate: boolean;
    selectors: string[];
    output: string;
    maxUrls: number;
    restart: boolean;
    memoryMBytes: number;
    silentMode: boolean;
}

(async () => {
    dotenv.config();

    const args = (yargs
        .usage(
            'Usage: $0 --url <url> --simulate <simulate> [--selectors <selector1 ...>] --output <output> --maxUrls <maxUrls> --restart <restart> --memoryMBytes <memoryMBytes> --silentMode <silentMode>',
        )
        .options({
            url: {
                type: 'string',
                describe: 'The URL to scan for accessibility issues',
                demandOption: true,
                default: 'https://accessibilityinsights.io/',
            },
            simulate: {
                type: 'boolean',
                describe: 'Simulate user click on elements that match to the specified selectors',
                default: false,
            },
            selectors: {
                type: 'array',
                describe: `List of CSS selectors to match against. Default selector is 'button'`,
                default: [],
            },
            output: {
                type: 'string',
                describe: `Output directory. Defaults to the value of APIFY_LOCAL_STORAGE_DIR, if set, or ./crawler_storage, if not.`,
            },
            maxUrls: {
                type: 'number',
                describe: ` Maximum number of pages that the crawler will open. The crawl will stop when this limit is reached.
                            The default is 100.
                            Note that in cases of parallel crawling, the actual number of pages visited might be slightly higher than this value.`,
                default: 100,
            },
            restart: {
                type: 'boolean',
                describe:
                    'If this flag is set, clear the queue of all pending and handled requests before crawling, otherwise resume the crawl from the last request in the queue.',
                default: false,
            },
            memoryMBytes: {
                type: 'number',
                describe: 'The maximum number of megabytes to be used by the crawler',
            },
            silentMode: {
                type: 'boolean',
                describe: 'Set to false if you want the browser to open the webpages while crawling',
                default: true,
            },
        })
        .describe('help', 'Print command line options').argv as unknown) as Arguments;

    await new CrawlerEntryPoint(setupCrawlerContainer()).crawl({
        baseUrl: args.url,
        simulate: args.simulate,
        selectors: args.selectors,
        localOutputDir: args.output,
        maxRequestsPerCrawl: args.maxUrls,
        restartCrawl: args.restart,
        memoryMBytes: args.memoryMBytes,
        silentMode: args.silentMode,
    });
})().catch((error) => {
    console.log('Exception: ', System.serializeError(error));
    process.exit(1);
});
