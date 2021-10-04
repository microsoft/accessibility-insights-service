// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import JSON5 from 'json5';
import { BaselineSchemaValidator } from './baseline-schema';
import { BaselineFileContent } from './baseline-types';

@injectable()
export class BaselineFileFormatter {
    constructor(
        @inject(BaselineSchemaValidator) private readonly baselineSchemaValidator: BaselineSchemaValidator,
        private readonly json5: typeof JSON5 = JSON5,
    ) {}

    public parse(rawBaselineContent: string): BaselineFileContent {
        const unvalidatedContent = this.json5.parse(rawBaselineContent);

        return this.baselineSchemaValidator.validate(unvalidatedContent);
    }

    public format(baselineContent: BaselineFileContent): string {
        return this.json5.stringify(baselineContent, null, 2);
    }
}
