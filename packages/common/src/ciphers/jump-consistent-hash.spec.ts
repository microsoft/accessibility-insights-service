// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { JumpConsistentHash } from './jump-consistent-hash';

describe('JumpConsistentHash', () => {
    it('Validate use of a stable underlying algorithm implementation', () => {
        const testCases = [
            {
                key: '10863919174838991',
                buckets: 11,
                result: 6,
            },
            {
                key: '2016238256797177309',
                buckets: 11,
                result: 3,
            },
            {
                key: '1673758223894951030',
                buckets: 11,
                result: 5,
            },
            {
                key: 2,
                buckets: 100001,
                result: 80343,
            },
            {
                key: 2201,
                buckets: 100001,
                result: 22152,
            },
            {
                key: 2202,
                buckets: 100001,
                result: 15018,
            },
        ];

        const hashGenerator = new JumpConsistentHash();
        testCases.forEach(testCase => {
            const bucket = hashGenerator.getBucket(testCase.key, testCase.buckets);
            expect(bucket).toEqual(testCase.result);
        });
    });

    it('Validate golden 100 keys of the algorithm', () => {
        const golden100: number[] = [0, 55, 62, 8, 45, 59, 86, 97, 82, 59, 73, 37, 17, 56, 86, 21, 90, 37, 38, 83];
        const hashGenerator = new JumpConsistentHash();
        for (let key: number = 0; key < golden100.length; key += 1) {
            const bucket = hashGenerator.getBucket(key, 100);
            expect(bucket).toEqual(golden100[key]);
        }
    });
});
