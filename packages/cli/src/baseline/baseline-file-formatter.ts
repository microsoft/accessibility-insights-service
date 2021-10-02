// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import JSON5 from 'json5';
import { format } from 'pretty-format';
import { BaselineSchemaValidator } from './baseline-schema';
import { BaselineFileContent } from './baseline-types';

@injectable()
export class BaselineFileFormatter {
    constructor(
        @inject(BaselineSchemaValidator) private readonly baselineSchemaValidator: BaselineSchemaValidator,
        private readonly json5: typeof JSON5 = JSON5,
        private readonly prettyFormat: typeof format = format,
    ) {}

    public parse(rawBaselineContent: string): BaselineFileContent {
        const unvalidatedContent = this.json5.parse(rawBaselineContent);

        return this.baselineSchemaValidator.validate(unvalidatedContent);
    }

    public format(baselineContent: BaselineFileContent): string {
        const formatOptions = {
            indent: 2,
            printBasicPrototype: false,
        };

        return this.prettyFormat(baselineContent, formatOptions);
    }
}
