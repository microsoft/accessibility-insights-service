// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { BaselineOptions, ScanArguments } from '..';
import { BaselineFileFormatter } from './baseline-file-formatter';

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class BaselineOptionsBuilder {
    constructor(
        @inject(BaselineFileFormatter) private readonly baselineFileFormatter: BaselineFileFormatter,
        private readonly fileSystem: typeof fs = fs,
    ) {}

    public build(scanArguments: ScanArguments): BaselineOptions | null {
        if (scanArguments.baselineFile == null) {
            if (scanArguments.updateBaseline != null) {
                throw new Error('updateBaseline is only supported when baselineFile is specified');
            }

            return null;
        }

        const rawBaselineContent = this.fileSystem.readFileSync(scanArguments.baselineFile, { encoding: 'utf8' });
        const baselineContent = this.baselineFileFormatter.parse(rawBaselineContent);

        return {
            baselineContent,
        };
    }
}
