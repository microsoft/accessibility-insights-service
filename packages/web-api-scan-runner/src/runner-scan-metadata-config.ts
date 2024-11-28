// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import yargs, { Arguments, Argv } from 'yargs';
import { RunnerScanMetadata } from 'service-library';

@injectable()
export class RunnerScanMetadataConfig {
    constructor(@optional() @inject('argvObj') private readonly argvObj: Argv = yargs) {
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
