#!/usr/bin/env node

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
// tslint:disable-next-line: no-import-side-effect
import './global-overrides';

// @ts-ignore
import * as cheerio from 'cheerio';

import { isEmpty } from 'lodash';
import * as yargs from 'yargs';
import { CliEntryPoint } from './cli-entry-point';
import { setupCliContainer } from './setup-cli-container';
import { ScanArguments } from './types/scan-arguments';

// tslint:disable-next-line:max-func-body-length
(async () => {
    const scanArguments = (yargs
        .wrap(yargs.terminalWidth())
        .usage(
            'Usage: $0 --crawl <crawl> --url <url> --simulate <simulate> [--selectors <selector1 ...>] --output <output> --maxUrls <maxUrls> --restart <restart> --snapshot <snapshot> --memoryMBytes <memoryMBytes> --silentMode <silentMode> [--existingUrls <url1 ...>] [--discoveryPatterns <pattern1 ...>]',
        )
        .options({
            crawl: {
                type: 'boolean',
                describe: 'Crawl web site under the provided URL.',
                demandOption: true,
                default: false,
            },
            url: {
                type: 'string',
                describe: 'The URL to scan (and crawl if --crawl option is selected) for accessibility issues',
                demandOption: true,
                default: 'https://accessibilityinsights.io/',
            },
            simulate: {
                type: 'boolean',
                describe: 'Simulate user click on elements that match to the specified selectors.',
                default: false,
            },
            selectors: {
                type: 'array',
                describe: `List of CSS selectors to match against, separated by space. Default selector is 'button'`,
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
                    'Clear the pending crawl queue and start crawl from the provided URL when set to true, otherwise resume the crawl from the last request in the queue.',
                default: false,
            },
            snapshot: {
                type: 'boolean',
                describe: 'Save snapshot of the crawled page. Enabled by default if simulation option is selected, otherwise false.',
            },
            memoryMBytes: {
                type: 'number',
                describe: 'The maximum number of megabytes to be used by the crawler',
            },
            silentMode: {
                type: 'boolean',
                describe: 'Not to open browser window while crawling when set to true.',
                default: true,
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

        const cliEntryPoint = new CliEntryPoint(setupCliContainer());
        await cliEntryPoint.runScan(scanArguments);
})().catch((error) => {
    console.log('Exception occurred while running the tool: ', error);
    process.exit(1);
});
