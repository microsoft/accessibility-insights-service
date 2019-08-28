// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any
// @ts-ignore
import { BN } from 'bn.js';

/**
 * Based on whitepaper 'A Fast, Minimal Memory, Consistent Hash Algorithm' https://arxiv.org/abs/1406.2294
 */
export class JumpConsistentHash {
    private readonly modulo64 = BN.red(new BN('10000000000000000', 16));
    private readonly multiplier = new BN('2862933555777941757', 10).toRed(this.modulo64);

    public getBucket(key: number | string, buckets: number): number {
        let keyBigInt = this.getKeyBigInt(key);
        let b = -1;
        let j = 0;
        while (j < buckets) {
            b = j;
            keyBigInt = keyBigInt.redMul(this.multiplier).iaddn(1);
            j = Math.floor((b + 1) * (2147483648 / (parseInt(keyBigInt.shrn(33).toString(16), 16) + 1)));
        }

        return b;
    }

    private getKeyBigInt(key: number | string): BN {
        if (typeof key === 'number') {
            return new BN(Math.floor(Math.abs(key))).toRed(this.modulo64);
        }

        return new BN(key, 10).toRed(this.modulo64);
    }
}
