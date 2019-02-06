import { IMock, It, Mock, Times } from 'typemoq';

import { Hash } from 'crypto';
import { HashIdGenerator } from './hash-id-generator';

describe('HashIdGenerator', () => {
    let sha256Mock: IMock<Hash>;
    let returnedHashMock: IMock<Hash>;
    let hashIdGenerator: HashIdGenerator;

    beforeEach(() => {
        sha256Mock = Mock.ofType<Hash>();
        returnedHashMock = Mock.ofType<Hash>();
        hashIdGenerator = new HashIdGenerator(sha256Mock.object);
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
