#!/usr/bin/env node

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import * as yargs from 'yargs';
import { CliEntryPoint } from './cli-entry-point';
import { ScanArguments } from './scanner/scan-arguments';
import { setupCliContainer } from './setup-cli-container';

(async () => {
    const scanArguments = (yargs
        .usage('Usage: $0 -url <url> -output <directoryPath>')
        .options({
            url: { type: 'string', describe: 'url to scan for accessibility', demandOption: true },
            output: { type: 'string', describe: 'output directory' },
        })
        .describe('help', 'show help').argv as unknown) as ScanArguments;

    const cliEntryPoint = new CliEntryPoint(setupCliContainer());
    await cliEntryPoint.runScan(scanArguments);
})().catch(error => {
    console.log('Exception thrown in scanner: ', error);
    process.exit(1);
});
