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
