// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-import-side-effect no-require-imports no-var-requires
require = require('esm')(module); // support ES6 module syntax for Office Fabric package

export { CrawlerEngine } from './crawler/crawler-engine';
export { CrawlerRunOptions } from './types/run-options';

import { System } from 'common';
import * as dotenv from 'dotenv';
import * as yargs from 'yargs';
import { CrawlerEngine } from './crawler/crawler-engine';

interface Arguments {
    url: string;
    simulate: boolean;
    selectors: string[];
    output: string;
}

(async () => {
    dotenv.config();

    const args = (yargs
        .usage('Usage: $0 --url <url> [--simulate] [--selectors <selector1 ...>] [--output]')
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
        })
        .describe('help', 'Print command line options').argv as unknown) as Arguments;

    const crawlerEngine: CrawlerEngine = new CrawlerEngine();

    await crawlerEngine.start({
        baseUrl: args.url,
        simulate: args.simulate,
        selectors: args.selectors,
        localOutputDir: args.output,
    });
})().catch((error) => {
    console.log('Exception: ', System.serializeError(error));
    process.exit(1);
});
