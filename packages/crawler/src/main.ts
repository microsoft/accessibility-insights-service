// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
// eslint-disable-next-line import/no-unassigned-import
import './global-overrides';

import { System } from 'common';
import * as dotenv from 'dotenv';
import { isEmpty } from 'lodash';
import * as yargs from 'yargs';
import * as inversify from 'inversify';
import { Crawler } from './crawler';
import { setupCrawlerContainer } from './setup-crawler-container';

interface ScanArguments {
    url: string;
    simulate: boolean;
    selectors: string[];
    output: string;
    maxUrls: number;
    restart: boolean;
    snapshot: boolean;
    memoryMBytes: number;
    silentMode: boolean;
    inputFile: string;
    existingUrls: string[];
    discoveryPatterns: string[];
    debug: boolean;
}

(async () => {
    dotenv.config();

    const scanArguments = (yargs
        .wrap(yargs.terminalWidth())
        .options({
            crawl: {
                type: 'boolean',
                describe: 'Crawl web site under the provided URL.',
                default: false,
            },
            url: {
                type: 'string',
                describe: '<url> The URL to scan (and crawl if --crawl option is selected) for accessibility issues.',
            },
            simulate: {
                type: 'boolean',
                describe: 'Simulate user click on elements that match to the specified selectors.',
                default: false,
            },
            selectors: {
                type: 'array',
                describe: `List of CSS selectors to match against, separated by space. Default selector is 'button'.`,
                default: [],
            },
            output: {
                type: 'string',
                describe: `Output directory. Defaults to the value of APIFY_LOCAL_STORAGE_DIR, if set, or ./crawler_storage, if not.`,
            },
            maxUrls: {
                type: 'number',
                describe: `Maximum number of pages that the crawler will open. The crawl will stop when this limit is reached. Default is 100.
                           Note that in cases of parallel crawling, the actual number of pages visited might be slightly higher than this value.`,
                default: 100,
            },
            restart: {
                type: 'boolean',
                describe:
                    'Clear the pending crawl queue and start crawl from the provided URL when set to true, otherwise resume the crawl from the last request in the queue.',
                default: false,
            },
            snapshot: {
                type: 'boolean',
                describe: 'Save snapshot of the crawled page. Enabled by default if simulation option is selected, otherwise false.',
            },
            memoryMBytes: {
                type: 'number',
                describe: 'The maximum number of megabytes to be used by the crawler.',
            },
            silentMode: {
                type: 'boolean',
                describe: 'Open browser window while crawling when set to true.',
                default: true,
            },
            debug: {
                type: 'boolean',
                describe: 'Disable crawler timeouts and open browser window for interactive debugging.',
                default: false,
            },
            inputFile: {
                type: 'string',
                describe: 'List of URLs to crawl in addition to URLs discovered from crawling the provided URL.',
            },
            existingUrls: {
                type: 'array',
                describe: `List of URLs to crawl in addition to URLs discovered from crawling the provided URL, separated by space.`,
            },
            discoveryPatterns: {
                type: 'array',
                describe: `List of RegEx patterns to crawl in addition to the provided URL, separated by space.`,
            },
        })
        .check((args) => {
            if (!args.crawl) {
                if ((isEmpty(args.url) && isEmpty(args.inputFile)) || (!isEmpty(args.url) && !isEmpty(args.inputFile))) {
                    throw new Error('Provide either --url or --inputFile option.');
                }
            } else {
                if (isEmpty(args.url)) {
                    throw new Error('The --url option is required.');
                }
            }

            return true;
        })
        .describe('help', 'Show help').argv as unknown) as ScanArguments;

    const container = new inversify.Container({ autoBindInjectable: true });
    await new Crawler(setupCrawlerContainer(container)).crawl({
        baseUrl: scanArguments.url,
        simulate: scanArguments.simulate,
        selectors: scanArguments.selectors,
        localOutputDir: scanArguments.output,
        maxRequestsPerCrawl: scanArguments.maxUrls,
        restartCrawl: scanArguments.restart,
        snapshot: scanArguments.snapshot,
        memoryMBytes: scanArguments.memoryMBytes,
        silentMode: scanArguments.silentMode,
        inputFile: scanArguments.inputFile,
        existingUrls: scanArguments.existingUrls,
        discoveryPatterns: scanArguments.discoveryPatterns,
        debug: scanArguments.debug,
    });
})().catch((error) => {
    console.log('Exception: ', System.serializeError(error));
    process.exitCode = 1;
});
