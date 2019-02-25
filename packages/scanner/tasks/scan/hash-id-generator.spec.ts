import { IMock, It, Mock, Times } from 'typemoq';

import { Hash } from 'crypto';
import * as shaJs from 'sha.js';
import { HashIdGenerator } from './hash-id-generator';

describe('HashIdGenerator', () => {
    let sha256Mock: IMock<Hash>;
    let shaJsMock: IMock<typeof shaJs>;
    let returnedHashMock: IMock<Hash>;
    let hashIdGenerator: HashIdGenerator;

    beforeEach(() => {
        sha256Mock = Mock.ofType<Hash>();
        shaJsMock = Mock.ofType<typeof shaJs>();
        returnedHashMock = Mock.ofType<Hash>();

        shaJsMock.setup(s => s('sha256')).returns(() => sha256Mock.object);
        hashIdGenerator = new HashIdGenerator(shaJsMock.object);
    });

    it('should generate same hash everytime without stubbing', () => {
        hashIdGenerator = new HashIdGenerator(shaJs);
        const hash1 = hashIdGenerator.generateHashId('u1', 'f1', 's1', 'r1');
        const hash2 = hashIdGenerator.generateHashId('u1', 'f1', 's1', 'r1');

        expect(hash1).toEqual(hash2);
    });

    it('should generate different hash if input is different without stubbing', () => {
        hashIdGenerator = new HashIdGenerator(shaJs);
        const hash1 = hashIdGenerator.generateHashId('u1', 'f1', 's1', 'r1');
        const hash2 = hashIdGenerator.generateHashId('u1', 'f1', 's2', 'r1');

        expect(hash1).not.toEqual(hash2);
    });

    it('generate scan result', () => {
        const expectedId: string = 'test id';
        const expectedHashSeed: string = 'a|b|c|d';

        setupHashFunction(expectedId, expectedHashSeed);

        expect(hashIdGenerator.generateHashId('a', 'b', 'c', 'd')).toBe(expectedId);
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
