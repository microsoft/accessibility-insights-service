// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Ajv, { Schema, ValidateFunction } from 'ajv';
import { inject, injectable } from 'inversify';
import { iocTypes } from '../ioc-types';
import { BaselineFormat } from './baseline-format';

export const baselineSchema: Schema = {
    type: 'object',
    properties: {
        metadata: {
            type: 'object',
            properties: {
                fileFormatVersion: { const: '1' },
            },
            additionalProperties: false,
        },
        results: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    rule: { type: 'string' },
                    cssSelector: { type: 'string' },
                    xpathSelector: { type: 'string' },
                    htmlSnippet: { type: 'string' },
                    urls: { type: 'array', items: { type: 'string' } },
                    additionalProperties: false,
                },
            },
        },
        additionalProperties: false,
    },
};

@injectable()
export class BaselineSchemaValidator {
    private readonly ajvValidator: ValidateFunction<BaselineFormat>;

    public constructor(
        @inject(iocTypes.ajv) private readonly ajvInstance: Ajv,
    ) {
        this.ajvValidator = this.ajvInstance.compile(baselineSchema);
    }

    public validate(unvalidatedObject: unknown): BaselineFormat {
        const isValid = this.ajvValidator(unvalidatedObject);
        if (isValid) {
            return unvalidatedObject;
        } else {
            throw new Error(`Baseline content did not match expected format. Errors: ${JSON.stringify(this.ajvValidator.errors)}`);
        }
    }
}