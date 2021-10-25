// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import json5 from 'json5';
import { BaselineSchemaValidator } from './baseline-schema';
import { BaselineFileContent } from './baseline-types';

@injectable()
export class BaselineFileFormatter {
    constructor(
        @inject(BaselineSchemaValidator) private readonly baselineSchemaValidator: BaselineSchemaValidator,
    ) {}

    public parse(rawBaselineContent: string): BaselineFileContent {
        const unvalidatedContent = json5.parse(rawBaselineContent);

        return this.baselineSchemaValidator.validate(unvalidatedContent);
    }

    public format(baselineContent: BaselineFileContent): string {
        return json5.stringify(baselineContent, null, 2);
    }
}
