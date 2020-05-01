#!/usr/bin/env node

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import 'reflect-metadata';
import * as yargs from 'yargs';
import { CliEntryPoint } from './cli-entry-point';
import { ScanArguments } from './scanner/scan-arguments';
import { setupCliContainer } from './setup-cli-container';

(async () => {
    const scanArguments = (yargs
        .usage('Usage: $0 --url <url> --filePath <filePath> --output <directoryPath>')
        .options({
            url: { type: 'string', describe: 'url to scan for accessibility' },
            filePath: { type: 'string', describe: 'file path that contians multiple urls to scan' },
            output: { type: 'string', describe: 'output directory' },
        })
        .check((args) => {
            if ((isEmpty(args.url) && isEmpty(args.filePath)) || (!isEmpty(args.url) && !isEmpty(args.filePath))) {
                throw new Error('You should input either url or filePath (only one)!');
            }

            return true;
        })
        .describe('help', 'show help').argv as unknown) as ScanArguments;

    const cliEntryPoint = new CliEntryPoint(setupCliContainer());
    await cliEntryPoint.runScan(scanArguments);
})().catch((error) => {
    console.log('Exception thrown in scanner: ', error);
    process.exit(1);
});
