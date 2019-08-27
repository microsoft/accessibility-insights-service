// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Hash } from 'crypto';
import * as sha256 from 'sha.js';
import { IMock, It, Mock, Times } from 'typemoq';
import { HashGenerator } from './hash-generator';

describe('HashGenerator', () => {
    let sha256Mock: IMock<Hash>;
    let shaJsMock: IMock<typeof sha256>;
    let returnedHashMock: IMock<Hash>;
    let hashGenerator: HashGenerator;

    beforeEach(() => {
        sha256Mock = Mock.ofType<Hash>();
        shaJsMock = Mock.ofType<typeof sha256>();
        returnedHashMock = Mock.ofType<Hash>();

        shaJsMock.setup(s => s('sha256')).returns(() => sha256Mock.object);
        hashGenerator = new HashGenerator(shaJsMock.object);
    });

    it('generate hash bucket', () => {
        hashGenerator = new HashGenerator(sha256);
        const bucket = hashGenerator.getHashBucket('bucket', 10000, 'id1', 'id2', 'id3');
        expect(bucket).toEqual('bucket-5553');
    });

    it('generate hash bucket with buckets range change', () => {
        hashGenerator = new HashGenerator(sha256);
        let bucket = hashGenerator.getHashBucket('bucket', 8000, '1');
        expect(bucket).toEqual('bucket-6762');

        bucket = hashGenerator.getHashBucket('bucket', 12000, '1');
        expect(bucket).toEqual('bucket-6762');
    });

    it('generate DB hash bucket', () => {
        hashGenerator = new HashGenerator(sha256);
        const bucket = hashGenerator.getDbHashBucket('bucket', 'id1', 'id2', 'id3');
        expect(bucket).toEqual('bucket-5553');
    });

    it('generate WebsitePageDocumentId', () => {
        hashGenerator = new HashGenerator(sha256);
        const id = hashGenerator.getWebsitePageDocumentId('baseUrl', 'url');
        const expectedId = hashGenerator.generateBase64Hash('baseUrl', 'url');
        expect(id).toEqual(expectedId);
    });

    it('generate WebsiteDocumentId', () => {
        hashGenerator = new HashGenerator(sha256);
        const id = hashGenerator.getWebsiteDocumentId('baseUrl');
        const expectedId = hashGenerator.generateBase64Hash('baseUrl');
        expect(id).toEqual(expectedId);
    });

    it('generate ScanResultDocumentId', () => {
        hashGenerator = new HashGenerator(sha256);
        const id = hashGenerator.getScanResultDocumentId('scanUrl', 'selector', 'html', 'resultId');
        const expectedId = hashGenerator.generateBase64Hash('scanUrl', 'selector', 'html', 'resultId');
        expect(id).toEqual(expectedId);
    });

    it('generate PageScanResultDocumentId', () => {
        hashGenerator = new HashGenerator(sha256);
        const id = hashGenerator.getPageScanResultDocumentId('baseUrl', 'url', 123456789);
        const expectedId = hashGenerator.generateBase64Hash('baseUrl', 'url', '123456789');
        expect(id).toEqual(expectedId);
    });

    it('should generate same hash every time without stubbing', () => {
        hashGenerator = new HashGenerator(sha256);
        const hash1 = hashGenerator.generateBase64Hash('u1', 'f1', 's1', 'r1');
        const hash2 = hashGenerator.generateBase64Hash('u1', 'f1', 's1', 'r1');

        expect(hash1).toEqual(hash2);
    });

    it('should generate different hash if input is different without stubbing', () => {
        hashGenerator = new HashGenerator(sha256);
        const hash1 = hashGenerator.generateBase64Hash('u1', 'f1', 's1', 'r1');
        const hash2 = hashGenerator.generateBase64Hash('u1', 'f1', 's2', 'r1');

        expect(hash1).not.toEqual(hash2);
    });

    it('generate scan result', () => {
        const expectedId: string = 'test id';
        const expectedHashSeed: string = 'a|b|c|d';

        setupHashFunction(expectedId, expectedHashSeed);

        expect(hashGenerator.generateBase64Hash('a', 'b', 'c', 'd')).toBe(expectedId);
        sha256Mock.verifyAll();
        returnedHashMock.verifyAll();
    });

    function setupHashFunction(expectedId: string, expectedHashSeed: string): void {
        sha256Mock
            .setup(b => b.update(It.isValue(expectedHashSeed)))
            .returns(() => returnedHashMock.object)
            .verifiable(Times.once());

        returnedHashMock
            .setup(b => b.digest(It.isValue('hex')))
            .returns(() => expectedId)
            .verifiable(Times.once());
    }
});
