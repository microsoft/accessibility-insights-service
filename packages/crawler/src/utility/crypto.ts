// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import SHA from 'sha.js';

export function generateHash(...values: string[]): string {
    const hashSeed: string = values.join('|').toLowerCase();
    const sha: typeof SHA = SHA;

    return sha('sha256')
        .update(hashSeed)
        .digest('base64')
        .replace(/(\+|\/|=)/g, '')
        .substr(0, 15);
}
