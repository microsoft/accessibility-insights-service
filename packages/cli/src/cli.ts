#!/usr/bin/env node
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import yargs from 'yargs';
import { System } from 'accessibility-insights-crawler';
import { CliEntryPoint } from './cli-entry-point';
import { ScanArguments } from './scan-arguments';
import { setupCliContainer } from './setup-cli-container';
import { validateScanArguments } from './validate-scan-arguments';

(async () => {
    const scanArguments = getScanArguments();
    const cliEntryPoint = new CliEntryPoint(setupCliContainer());
    await cliEntryPoint.runScan(scanArguments);
})()
    .catch((error) => {
        console.log('Exception occurred while running the tool: ', System.serializeError(error));
        process.exitCode = 1;
    })
    .finally(() => {
        process.exit();
    });

function getScanArguments(): ScanArguments {
    const defaultOutputDir = 'ai_scan_cli_output';

    return yargs
        .wrap(yargs.terminalWidth())
        .options({
            crawl: {
                type: 'boolean',
                describe: 'Crawl web site under the provided URL.',
                default: false,
            },
            url: {
                type: 'string',
                describe: 'The URL to scan (and crawl if --crawl option is selected) for accessibility issues.',
            },
            simulate: {
                type: 'boolean',
                describe: 'Simulate user click on elements that match to the specified selectors.',
                default: false,
            },
            selectors: {
                type: 'array',
                describe: `List of CSS selectors to match against. Default selector is 'button'.`,
                default: [],
            },
            output: {
                type: 'string',
                describe: `Output directory. Defaults to the value of CRAWLEE_STORAGE_DIR, if set, or ./${defaultOutputDir}, if not.`,
                default: defaultOutputDir,
            },
            maxUrls: {
                type: 'number',
                describe: `Maximum number of pages that the crawler will open. The crawl will stop when this limit is reached. Default is 100.
                           Note that in cases of parallel crawling, the actual number of pages visited might be slightly higher than this value.`,
                default: 100,
                alias: 'maxurls',
            },
            restart: {
                type: 'boolean',
                describe:
                    'Clear the pending crawl queue and start crawl from the provided URL when set to true, otherwise resume the crawl from the last request in the queue.',
                default: false,
            },
            continue: {
                type: 'boolean',
                describe: `Continue to crawl using the pending crawl queue. Use this option to continue when previous scan was terminated.
                           Note that --url option will be ignored and previous value will be used instead.`,
                default: false,
            },
            snapshot: {
                type: 'boolean',
                describe: 'Save snapshot of the crawled page. Enabled by default if simulation option is selected, otherwise false.',
            },
            memoryMBytes: {
                type: 'number',
                describe: 'The maximum number of megabytes to be used by the crawler.',
                alias: 'memorymbytes',
            },
            silentMode: {
                type: 'boolean',
                describe: 'Open browser window while crawling when set to true.',
                default: true,
                alias: 'silentmode',
            },
            inputFile: {
                type: 'string',
                describe: 'List of URLs to crawl in addition to URLs discovered from crawling the provided URL.',
                alias: 'inputfile',
            },
            inputUrls: {
                type: 'array',
                describe: `List of URLs to crawl in addition to URLs discovered from crawling the provided URL.`,
                alias: 'inputurls',
            },
            discoveryPatterns: {
                type: 'array',
                describe: `List of RegEx patterns to crawl in addition to the provided URL.`,
                alias: 'discoverypatterns',
            },
            baselineFile: {
                type: 'string',
                describe: `Baseline file path. If specified, scan results will be compared to baseline results and the summary report will denote which results are new.
                           If the results do not match the baseline file, a new baseline will be written to the output directory. To update the existing baseline file instead, use --updateBaseline.`,
                alias: 'baselinefile',
                hidden: false,
            },
            updateBaseline: {
                type: 'boolean',
                describe:
                    'Use with --baselineFile to update the baseline file in-place, rather than writing any updated baseline to the output directory.',
                alias: 'updatebaseline',
                default: false,
                hidden: false,
            },
            debug: {
                type: 'boolean',
                describe: 'Enables crawler engine debug mode.',
                default: false,
                hidden: true,
            },
            singleWorker: {
                type: 'boolean',
                describe: 'Uses a single crawler worker.',
                default: false,
                alias: 'singleworker',
            },
            authType: {
                type: 'string',
                describe:
                    'Use with --serviceAccountName and --serviceAccountPassword to specify the authentication type. Supported type: AAD.',
            },
            serviceAccountName: {
                type: 'string',
                describe: 'Use with --serviceAccountPassword and --authType to crawl pages requiring authentication.',
            },
            serviceAccountPassword: {
                type: 'string',
                describe: 'Use with --serviceAccountName and --authType to crawl pages requiring authentication.',
            },
            userAgent: {
                type: 'string',
                describe:
                    'The custom value of the User-Agent HTTP request header. Defaults to the value of USER_AGENT environment variable. The option will take precedence over environment variable.',
            },
            httpHeaders: {
                type: 'string',
                describe: `The custom HTTP header(s) to be send on each crawl request. Accepts JSON formatted string like {"name": "value"}.`,
            },
            adhereFilesystemPattern: {
                type: 'boolean',
                describe:
                    'Adhere to the pattern when URLs with a trailing slash indicates a directory, and those without a trailing slash denotes a file.',
                default: true,
            },
            browserOptions: {
                type: 'array',
                describe: `List of Chrome command line options to pass on browser start. Can be used to disable CORS to scan protected page: --browserOptions disable-web-security`,
                alias: 'browseroptions',
            },
            keepUrlFragment: {
                type: 'boolean',
                describe: `To keep the hash fragment in the URLs. If set to false, it will remove hash fragment from URL. For example, http://www.example.com/#foo will be considered as http://www.example.com.`,
                default: false,
                alias: 'keepurlfragment',
            },
        })
        .check((args) => {
            validateScanArguments(args as ScanArguments);

            return true;
        })
        .describe('help', 'Show help').argv as unknown as ScanArguments;
}
