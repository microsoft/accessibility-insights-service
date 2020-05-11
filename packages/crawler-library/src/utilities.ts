// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as Apify from 'apify';
import * as sha256 from 'sha.js';
import { RequestQueueBase } from './request-queue-base';

export function toApifyInstance(requestQueue: Apify.RequestQueue | RequestQueueBase): Apify.RequestQueue {
    return <Apify.RequestQueue>(<unknown>requestQueue);
}

export function generateBase64Hash(...values: string[]): string {
    const hashSeed: string = values.join('|').toLowerCase();
    const sha: typeof sha256 = sha256;

    return sha('sha256').update(hashSeed).digest('hex');
}
