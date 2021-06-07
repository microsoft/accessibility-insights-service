// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
// eslint-disable-next-line import/no-unassigned-import
import './global-overrides';

import { System } from 'common';
import * as dotenv from 'dotenv';
import * as yargs from 'yargs';
import * as inversify from 'inversify';
import { Crawler } from './crawler';
import { setupLocalCrawlerContainer } from './setup-crawler-container';

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
    inputUrls: string[];
    discoveryPatterns: string[];
    debug: boolean;
    crawl: boolean;
}

(async () => {
    dotenv.config();
    const scanArguments = yargs.argv as unknown as ScanArguments;

    const container = new inversify.Container({ autoBindInjectable: true });
    await new Crawler(setupLocalCrawlerContainer(container)).crawl({
        crawl: scanArguments.crawl,
        baseUrl: scanArguments.url,
        simulate: scanArguments.simulate,
        selectors: scanArguments.selectors,
        localOutputDir: scanArguments.output,
        maxRequestsPerCrawl: scanArguments.maxUrls,
        restartCrawl: scanArguments.restart,
        snapshot: scanArguments.snapshot,
        memoryMBytes: scanArguments.memoryMBytes,
        silentMode: scanArguments.silentMode,
        inputUrls: scanArguments.inputUrls,
        discoveryPatterns: scanArguments.discoveryPatterns,
        debug: scanArguments.debug,
    });
})().catch((error) => {
    console.log('Exception: ', System.serializeError(error));
    process.exitCode = 1;
});
