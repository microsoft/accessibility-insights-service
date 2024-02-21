// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import fnv1a from '@sindresorhus/fnv1a';
import { injectable } from 'inversify';
import { JumpConsistentHash } from './jump-consistent-hash';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const shaJS = require('sha.js');

@injectable()
export class HashGenerator {
    public constructor(private readonly shaObj = shaJS) {}

    public getWebsiteScanDataDocumentId(baseUrl: string, scanGroupId: string): string {
        // Preserve parameters order below for the hash generation compatibility
        return this.generateBase64Hash(baseUrl, scanGroupId);
    }

    public getWebsiteScanPageDataDocumentId(websiteId: string, scanId: string): string {
        // Preserve parameters order below for the hash generation compatibility
        return this.generateBase64Hash(websiteId, scanId);
    }

    public getWebsiteScanResultDocumentId(baseUrl: string, scanGroupId: string): string {
        // Preserve parameters order below for the hash generation compatibility
        return this.generateBase64Hash(baseUrl, scanGroupId);
    }

    public getWebsiteScanResultPartDocumentId(baseId: string, scanId: string): string {
        // Preserve parameters order below for the hash generation compatibility
        return this.generateBase64Hash(baseId, scanId);
    }

    public getDbHashBucket(prefix: string, ...values: string[]): string {
        // Changing buckets count will affect bucket generation of the same values
        return this.getHashBucket(prefix, 1000, ...values);
    }

    public getHashBucket(prefix: string, buckets: number, ...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();
        const hash = fnv1a(hashSeed);
        const hashGenerator = new JumpConsistentHash();
        const bucket = hashGenerator.getBucket(hash, buckets);

        return `${prefix}-${bucket}`;
    }

    public generateBase64Hash(...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();

        return this.shaObj('sha256').update(hashSeed).digest('hex');
    }

    public generateBase64Hash128(...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();
        const hash = this.shaObj('sha256').update(hashSeed);
        const buffer = hash.digest().subarray(0, 16);

        return buffer.toString('hex');
    }
}
