// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-import-side-effect no-require-imports no-var-requires
require = require('esm')(module); // support ES6 module syntax for Office Fabric package

import './overrides'; // should be the first package import

import * as dotenv from 'dotenv';
import * as yargs from 'yargs';
import * as crawler from './main';
import { SimulatorPageProcessorFactory } from './page-processors/simulator-page-processor';

interface Arguments {
    url: string;
    simulate: boolean;
    selectors: string[];
}

(async () => {
    dotenv.config();

    const args = (yargs
        .usage('Usage: $0 --url <url> [--simulate] [--selectors <selector1 ...>]')
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
            },
            selectors: {
                type: 'array',
                describe: `List of CSS selectors to match against. Default selector is 'button'`,
                default: [],
            },
        })
        .describe('help', 'Print command line options').argv as unknown) as Arguments;

    const crawlerEngine = args.simulate
        ? new crawler.CrawlerEngine(undefined, new SimulatorPageProcessorFactory())
        : new crawler.CrawlerEngine();
    await crawlerEngine.start({
        baseUrl: args.url,
        simulate: args.simulate,
        selectors: args.selectors,
    });
})().catch((error) => {
    console.log('Exception: ', error);
    process.exit(1);
});
