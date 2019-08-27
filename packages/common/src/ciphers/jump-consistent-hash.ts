// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as BigInt from 'big-integer';

export class JumpConsistentHash {
    public getBucket(key: number, numBuckets: number): number {
        let keyBigInt = BigInt(key);
        const numBucketsBigInt = BigInt(numBuckets);
        let b = BigInt(-1);
        let j = BigInt(0);
        while (j < numBucketsBigInt) {
            b = j;
            keyBigInt = keyBigInt
                .multiply(BigInt(2862933555777941757))
                .mod(BigInt(2).pow(64))
                .add(1);
            j = BigInt(
                Math.trunc(
                    b.add(1).toJSNumber() *
                        (BigInt(1)
                            .shiftLeft(31)
                            .toJSNumber() /
                            keyBigInt
                                .shiftRight(33)
                                .add(1)
                                .toJSNumber()),
                ),
            );
        }

        return b.toJSNumber();
    }
}
