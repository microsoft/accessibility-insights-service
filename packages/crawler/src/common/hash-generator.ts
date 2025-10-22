// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const shaJS = require('sha.js');

@injectable()
export class HashGenerator {
    public constructor(@optional() @inject('sha') private readonly shaObj = shaJS) {}

    public generateBase64Hash(...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();

        return this.shaObj('sha256').update(hashSeed).digest('hex');
    }
}
