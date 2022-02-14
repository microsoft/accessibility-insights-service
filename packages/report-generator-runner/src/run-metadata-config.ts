// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import yargs, { Arguments, Argv } from 'yargs';
import { ReportGeneratorMetadata } from './types/report-generator-metadata';

@injectable()
export class RunMetadataConfig {
    constructor(private readonly argvObj: Argv = yargs) {}

    public getConfig(): ReportGeneratorMetadata {
        this.argvObj.env().demandOption(['scanGroupId']);

        return this.argvObj.argv as Arguments<ReportGeneratorMetadata>;
    }
}
