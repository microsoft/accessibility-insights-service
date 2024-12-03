// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import yargs, { Arguments, Argv } from 'yargs';
import { ReportGeneratorMetadata } from './types/report-generator-metadata';

@injectable()
export class RunMetadataConfig {
    constructor(@optional() @inject('argvObj') private readonly argvObj: Argv = yargs) {
        argvObj.options({
            scanGroupId: {
                type: 'string',
                alias: 'scangroupid',
            },
            targetReport: {
                type: 'string',
                alias: 'targetreport',
            },
        });
    }

    public getConfig(): ReportGeneratorMetadata {
        this.argvObj.env().demandOption(['id']);
        this.argvObj.env().demandOption(['scanGroupId']);
        this.argvObj.env().demandOption(['targetReport']);

        return this.argvObj.argv as Arguments<ReportGeneratorMetadata>;
    }
}
