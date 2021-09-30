// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Ajv, { Schema, ValidateFunction } from 'ajv';
import { inject, injectable } from 'inversify';
import { iocTypes } from '../ioc-types';
import { BaselineFileContent } from './baseline-format';

export const baselineSchema: Schema = {
    type: 'object',
    properties: {
        metadata: {
            type: 'object',
            properties: {
                fileFormatVersion: { const: '1' }
            },
            required: ['fileFormatVersion'],
            additionalProperties: false,
        },
        results: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    rule: { type: 'number' },
                    urls: { type: 'array', items: { type: 'string' } },
                    cssSelector: { type: 'string' },
                    xpathSelector: { type: 'string' },
                    htmlSnippet: { type: 'string' },
                },
                // xpathSelector is intentionally optional
                required: ['rule', 'cssSelector', 'htmlSnippet', 'urls'],
                additionalProperties: false,
            }
        },
    },
    required: ['metadata', 'results'],
    additionalProperties: false,
};

@injectable()
export class BaselineSchemaValidator {
    private readonly ajvValidator: ValidateFunction<BaselineFileContent>;

    public constructor(
        @inject(iocTypes.ajv) private readonly ajvInstance: Ajv,
    ) {
        this.ajvValidator = this.ajvInstance.compile(baselineSchema);
    }

    public validate(unvalidatedObject: unknown): BaselineFileContent {
        const isValid = this.ajvValidator(unvalidatedObject);
        if (isValid) {
            return unvalidatedObject;
        } else {
            throw new Error(`Baseline content did not match expected format. Error(s):\n\n${JSON.stringify(this.ajvValidator.errors)}`);
        }
    }
}