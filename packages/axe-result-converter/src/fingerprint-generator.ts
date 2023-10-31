// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HashGenerator } from 'common';
import { injectable, inject } from 'inversify';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface FingerprintParameters {
    rule: string;
    snippet: string;
    cssSelector: string;
    xpathSelector?: string;
}

@injectable()
export class FingerprintGenerator {
    constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public getFingerprint(fingerprintParameters: FingerprintParameters): string {
        const valuesToHash = [fingerprintParameters.rule, fingerprintParameters.snippet, fingerprintParameters.cssSelector];

        if (fingerprintParameters.xpathSelector) {
            valuesToHash.push(fingerprintParameters.xpathSelector);
        }

        return this.hashGenerator.generateBase64Hash(...valuesToHash);
    }
}
