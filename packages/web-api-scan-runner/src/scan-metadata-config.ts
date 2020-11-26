// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import yargs, { Arguments, Argv } from 'yargs';
import { ScanMetadata } from './types/scan-metadata';

@injectable()
export class ScanMetadataConfig {
    constructor(private readonly argvObj: Argv = yargs) {}

    public getConfig(): ScanMetadata {
        this.argvObj.env().demandOption(['id', 'url']);

        return this.argvObj.argv as Arguments<ScanMetadata>;
    }
}
