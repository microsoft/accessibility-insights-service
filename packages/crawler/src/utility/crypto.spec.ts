// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { generateHash } from './crypto';

describe(generateHash, () => {
    it('ensure hash generation consistency', () => {
        const actualHash1 = generateHash('key1', 'key2', 'key3');
        const actualHash2 = generateHash('Key1', 'Key2', 'Key3');

        const expectedHash = '0ZuOUfdmWxzU08K';

        expect(expectedHash).toEqual(actualHash1);
        expect(expectedHash).toEqual(actualHash2);
    });
});
