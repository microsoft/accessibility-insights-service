// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import * as yargs from 'yargs';
import { CliEntryPoint } from './cli-entry-point';
import { ScanArguments } from './scan-arguments';
import { setupCliContainer } from './setup-cli-container';

(async () => {
    const argv = (yargs
        .usage('Usage: $0 -url url -maxdepth depth')
        .options({
            url: { type: 'string', describe: 'url to scan for accessibility' },
            maxdepth: { type: 'number', demandOption: false, nargs: 1 },
        })
        .describe('help', 'show help').argv as unknown) as ScanArguments;

    const cliEntryPoint = new CliEntryPoint(setupCliContainer());
    cliEntryPoint.setScanArguments(argv);
    await cliEntryPoint.start();
})().catch(error => {
    console.log('Exception thrown in runner: ', error);
    process.exit(1);
});
