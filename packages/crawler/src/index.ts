// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-import-side-effect no-require-imports no-var-requires
require = require('esm')(module); // support ES6 module syntax for Office Fabric package

export { CrawlerEngine } from './crawler/crawler-engine';
export { CrawlerRunOptions } from './types/run-options';

import 'reflect-metadata';

import { ServiceConfiguration, System } from 'common';
import * as dotenv from 'dotenv';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import * as yargs from 'yargs';
import { CrawlerEngine } from './crawler/crawler-engine';

interface Arguments {
    url: string;
    simulate: boolean;
    selectors: string[];
    output: string;
    maxUrls: number;
}

(async () => {
    dotenv.config();

    const args = (yargs
        .usage('Usage: $0 --url <url> --simulate <simulate> [--selectors <selector1 ...>] --output <output> --maxUrls <maxUrls>')
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
                describe: `Output directory`,
            },
            maxUrls: {
                type: 'number',
                describe: ` Maximum number of pages that the crawler will open. The crawl will stop when this limit is reached.
                            The default is 100.
                            Note that in cases of parallel crawling, the actual number of pages visited might be slightly higher than this value.`,
                default: 100,
            },
        })
        .describe('help', 'Print command line options').argv as unknown) as Arguments;

    const serviceConfig = new ServiceConfiguration();
    const logger = new GlobalLogger([new ConsoleLoggerClient(serviceConfig, console)], process);
    await logger.setup();

    const crawlerEngine: CrawlerEngine = new CrawlerEngine(logger);

    await crawlerEngine.start({
        baseUrl: args.url,
        simulate: args.simulate,
        selectors: args.selectors,
        localOutputDir: args.output,
        maxRequestsPerCrawl: args.maxUrls,
    });
})().catch((error) => {
    console.log('Exception: ', System.serializeError(error));
    process.exit(1);
});
