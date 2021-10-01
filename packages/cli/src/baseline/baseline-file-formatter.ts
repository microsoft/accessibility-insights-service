// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import JSON5 from 'json5';
import { format } from 'pretty-format';
import { BaselineSchemaValidator } from './baseline-schema';
import { BaselineFileContent } from './baseline-types';

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class BaselineFileFormatter {
    constructor(
        @inject(BaselineSchemaValidator) private readonly baselineSchemaValidator: BaselineSchemaValidator,
        private readonly fileSystem: typeof fs = fs,
        private readonly json5: typeof JSON5 = JSON5,
    ) {}

    public readFileSync(filePath: string): BaselineFileContent {
        const rawBaselineContent = this.fileSystem.readFileSync(filePath, { encoding: 'utf8' });

        const unvalidatedContent = this.json5.parse(rawBaselineContent);

        return this.baselineSchemaValidator.validate(unvalidatedContent);
    }

    public format(baselineContent: BaselineFileContent): string {
        const formatOptions = {
            indent: 2,
            printBasicPrototype: false,
        };

        return format(baselineContent, formatOptions);
    }
}
