// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { HashGenerator } from 'accessibility-insights-crawler';
import { FingerprintGenerator, FingerprintParameters } from './fingerprint-generator';

let hashGeneratorMock: IMock<HashGenerator>;
let fingerprintGenerator: FingerprintGenerator;

const setupThreeParameterHash = (): void => {
    hashGeneratorMock
        .setup((o) => o.generateBase64Hash(It.isAny(), It.isAny(), It.isAny()))
        .returns((...args: string[]) => {
            return args.join('|');
        })
        .verifiable(Times.atLeastOnce());
};

const setupFourParameterHash = (): void => {
    hashGeneratorMock
        .setup((o) => o.generateBase64Hash(It.isAny(), It.isAny(), It.isAny(), It.isAny()))
        .returns((...args: string[]) => {
            return args.join('|');
        })
        .verifiable(Times.atLeastOnce());
};

describe('FingerprintGenerator', () => {
    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        fingerprintGenerator = new FingerprintGenerator(hashGeneratorMock.object);
    });

    afterEach(() => {
        hashGeneratorMock.verifyAll();
    });

    it('uses expected parameters without xpathSelector', () => {
        setupThreeParameterHash();
        const fingerprintParameters: FingerprintParameters = {
            rule: 'rule-id-1',
            snippet: 'snippet 1',
            cssSelector: 'css selector 1',
        };

        expect(fingerprintGenerator.getFingerprint(fingerprintParameters)).toBe('rule-id-1|snippet 1|css selector 1');
    });

    it('uses expected parameters with xpathSelector', () => {
        setupFourParameterHash();
        const fingerprintParameters: FingerprintParameters = {
            rule: 'rule-id-2',
            snippet: 'snippet 2',
            cssSelector: 'css selector 2',
            xpathSelector: 'xpath selector 2',
        };

        expect(fingerprintGenerator.getFingerprint(fingerprintParameters)).toBe('rule-id-2|snippet 2|css selector 2|xpath selector 2');
    });

    it('is independent of parameter ordering', () => {
        setupFourParameterHash();
        const fingerprintParameters: FingerprintParameters = {
            xpathSelector: 'xpath selector 3',
            cssSelector: 'css selector 3',
            snippet: 'snippet 3',
            rule: 'rule-id-3',
        };

        expect(fingerprintGenerator.getFingerprint(fingerprintParameters)).toBe('rule-id-3|snippet 3|css selector 3|xpath selector 3');
    });
});
