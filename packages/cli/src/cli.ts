#!/usr/bin/env node

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
// tslint:disable-next-line: no-import-side-effect
import './module-name-mapper';

import { isEmpty } from 'lodash';
import * as yargs from 'yargs';
import { CliEntryPoint } from './cli-entry-point';
import { ScanArguments } from './scanner/scan-arguments';
import { setupCliContainer } from './setup-cli-container';

(async () => {
    const scanArguments = (yargs
        .usage('Usage: $0 --url <url> --inputFile <inputFile> --output <directoryPath>')
        .options({
            url: { type: 'string', describe: 'url to scan for accessibility' },
            inputFile: { type: 'string', describe: 'file path that contains multiple urls separated by newline to scan' },
            output: { type: 'string', describe: 'output directory' },
        })
        .check((args) => {
            if ((isEmpty(args.url) && isEmpty(args.inputFile)) || (!isEmpty(args.url) && !isEmpty(args.inputFile))) {
                throw new Error('You should provide either url or inputFile parameter only!');
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
