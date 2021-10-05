// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { BaselineOptions, ScanArguments } from '..';
import { BaselineFileFormatter } from './baseline-file-formatter';
import { BaselineFileContent } from './baseline-types';

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class BaselineOptionsBuilder {
    constructor(
        @inject(BaselineFileFormatter) private readonly baselineFileFormatter: BaselineFileFormatter,
        private readonly fileSystem: typeof fs = fs,
    ) {}

    public build(scanArguments: ScanArguments): BaselineOptions | null {
        if (scanArguments.baselineFile == null) {
            if (scanArguments.updateBaseline) {
                throw new Error('updateBaseline is only supported when baselineFile is specified');
            }

            return null;
        }

        return {
            baselineContent: this.readPossibleBaselineFile(scanArguments.baselineFile),
        };
    }

    private readPossibleBaselineFile(baselineFile: string): BaselineFileContent | null {
        let rawBaselineContent: string;
        try {
            rawBaselineContent = this.fileSystem.readFileSync(baselineFile, { encoding: 'utf8' });
        } catch (e) {
            if (e.code === 'ENOENT') {
                // This is expected; it just means a user is onboarding to baselining for the first time
                // and we're generating an initial baseline file.
                return null;
            } else {
                throw e;
            }
        }

        return this.baselineFileFormatter.parse(rawBaselineContent);
    }
}
