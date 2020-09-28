// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/restrict-plus-operands, no-bitwise */

/**
 * Based on whitepaper 'A Fast, Minimal Memory, Consistent Hash Algorithm' https://arxiv.org/abs/1406.2294
 */
export class JumpConsistentHash {
    public getBucket(key: number | string | BigInt, buckets: number): number {
        let keyBigInt = BigInt(key);
        let b = -1n;
        let j = 0n;
        const div = 2n ** 64n;
        while (j < buckets) {
            b = j;
            keyBigInt = ((keyBigInt * 2862933555777941757n) % div) + 1n;
            j = BigInt(Math.floor(((Number(b) + 1) * Number(1n << 31n)) / Number((keyBigInt >> 33n) + 1n)));
        }

        return Number(b);
    }
}
