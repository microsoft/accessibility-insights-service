// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import fnv1a from '@sindresorhus/fnv1a';
import { injectable } from 'inversify';
import SHA from 'sha.js';
import { JumpConsistentHash } from './jump-consistent-hash';

@injectable()
export class HashGenerator {
    public constructor(private readonly sha: typeof SHA = SHA) {}

    public generateBase64Hash(...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();

        return this.sha('sha256').update(hashSeed).digest('hex');
    }

    public getPageScanResultDocumentId(baseUrl: string, url: string, runTimeValue: number): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(baseUrl, url, runTimeValue.toString());
    }

    public getScanResultDocumentId(scanUrl: string, selector: string, html: string, resultId: string): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(scanUrl, selector, html, resultId);
    }

    public getWebsiteDocumentId(baseUrl: string): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(baseUrl);
    }

    public getWebsitePageDocumentId(baseUrl: string, url: string): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(baseUrl, url);
    }

    public getDbHashBucket(prefix: string, ...values: string[]): string {
        // change of buckets count may affect bucket generation of the same values
        return this.getHashBucket(prefix, 1000, ...values);
    }

    public getHashBucket(prefix: string, buckets: number, ...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();
        const hash = fnv1a(hashSeed);
        const hashGenerator = new JumpConsistentHash();
        const bucket = hashGenerator.getBucket(hash, buckets);

        return `${prefix}-${bucket}`;
    }
}
