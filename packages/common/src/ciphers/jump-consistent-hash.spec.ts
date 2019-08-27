// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { JumpConsistentHash } from './jump-consistent-hash';

describe('JumpConsistentHash', () => {
    it('Basic test', () => {
        const testCases = [{ bucket: 0, key: 1, range: 1 }, { bucket: 4, key: 100, range: 20 }];

        const hashGenerator = new JumpConsistentHash();
        testCases.forEach(testCase => {
            const bucket = hashGenerator.getBucket(testCase.key, testCase.range);
            expect(bucket).toEqual(testCase.bucket);
        });
    });
});
