// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import yargs, { Arguments, Argv } from 'yargs';
import { RunnerScanMetadata } from 'service-library';

@injectable()
export class RunnerScanMetadataConfig {
    constructor(private readonly argvObj: Argv = yargs) {
        argvObj.options({
            deepScan: {
                type: 'boolean',
                alias: 'deepscan',
            },
        });
    }

    public getConfig(): RunnerScanMetadata {
        this.argvObj.env().demandOption(['id', 'url']);

        return this.argvObj.argv as Arguments<RunnerScanMetadata>;
    }
}
