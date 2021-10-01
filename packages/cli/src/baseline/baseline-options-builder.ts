// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import JSON5 from 'json5';
import { BaselineOptions, ScanArguments } from '..';
import { BaselineSchemaValidator } from './baseline-schema';
import { BaselineFileContent } from './baseline-types';

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class BaselineOptionsBuilder {
    constructor(
        @inject(BaselineSchemaValidator) private readonly baselineSchemaValidator: BaselineSchemaValidator,
        private readonly fileSystem: typeof fs = fs,
        private readonly json5: typeof JSON5 = JSON5,
    ) {}

    public build(scanArguments: ScanArguments): BaselineOptions | null {
        if (scanArguments.baselineFile == null) {
            if (scanArguments.updateBaseline != null) {
                throw new Error('updateBaseline is only supported when baselineFile is specified');
            }

            return null;
        }

        const baselineContent = this.readBaselineFileSync(scanArguments.baselineFile);

        return {
            baselineContent,
            urlNormalizer: null,
        };
    }

    private readBaselineFileSync(filePath: string): BaselineFileContent {
        const rawBaselineContent = this.fileSystem.readFileSync(filePath, { encoding: 'utf8' });

        const unvalidatedContent = this.json5.parse(rawBaselineContent);

        return this.baselineSchemaValidator.validate(unvalidatedContent);
    }
}
