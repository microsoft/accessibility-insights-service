// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-ignore
import * as jumphash from 'jumphash';

/**
 * Based on white paper 'A Fast, Minimal Memory, Consistent Hash Algorithm' https://arxiv.org/abs/1406.2294
 * (PDF only https://arxiv.org/pdf/1406.2294.pdf)
 */
export class JumpConsistentHash {
    public getBucket(key: number, buckets: number): number {
        // tslint:disable-next-line: no-unsafe-any
        return jumphash(key, buckets);
    }
}
