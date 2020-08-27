#!/usr/bin/env node

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
// tslint:disable-next-line: no-import-side-effect
import './module-name-mapper';

import { CrawlerEntryPoint, setupCrawlerContainer } from 'accessibility-insights-crawler';
import { isEmpty } from 'lodash';
import * as yargs from 'yargs';
import { CliEntryPoint } from './cli-entry-point';
import { ScanArguments } from './scanner/scan-arguments';
import { setupCliContainer } from './setup-cli-container';

// tslint:disable-next-line:max-func-body-length
(async () => {
    const scanArguments = (yargs
        .usage(
            'Usage: $0 --crawl <crawl> --url <url> --simulate <simulate> [--selectors <selector1 ...>] --output <output> --maxUrls <maxUrls> --restart <restart> --snapshot <snapshot> --memoryMBytes <memoryMBytes> --silentMode <silentMode> [--existingUrls <url1 ...>] [--discoveryPatterns <pattern1 ...>]',
        )
        .options({
            crawl: {
                type: 'boolean',
                describe: 'Crawl if true',
                demandOption: true,
                default: false,
            },
            url: {
                type: 'string',
                describe: 'The URL to scan for accessibility issues',
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
            snapshot: {
                type: 'boolean',
                describe:
                    'Save snapshot of the crawled page, if no value is not provided, it will be true  if simulation is enabled, otherwise false',
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
            inputFile: {
                type: 'string',
                describe: 'List of URLs to crawl in addition to URLs discovered from crawling base URL',
            },
            existingUrls: {
                type: 'array',
                describe: `List of URLs to crawl in addition to URLs discovered from crawling base URL`,
            },
            discoveryPatterns: {
                type: 'array',
                describe: `List of patterns to crawl in addition to the base url`,
            },
        })
        .check((args) => {
            if (args.crawl) {
                if ((isEmpty(args.url) && isEmpty(args.inputFile)) || (!isEmpty(args.url) && !isEmpty(args.inputFile))) {
                    throw new Error('You should provide either url or inputFile parameter only!');
                }
            } else {
                if (isEmpty(args.url)) {
                    throw new Error('You should provide a url to crawl!');
                }
            }

            return true;
        })
        .describe('help', 'show help').argv as unknown) as ScanArguments;

    if (!scanArguments.crawl) {
        const cliEntryPoint = new CliEntryPoint(setupCliContainer());
        await cliEntryPoint.runScan(scanArguments);
    } else {
        await new CrawlerEntryPoint(setupCrawlerContainer()).crawl({
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
        });
    }
})().catch((error) => {
    console.log('Exception thrown in scanner: ', error);
    process.exit(1);
});
