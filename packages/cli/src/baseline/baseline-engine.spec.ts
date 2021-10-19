// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AxeCoreResults, AxeResult, AxeResultsList } from 'axe-result-converter';
import { FingerprintGenerator, FingerprintParameters } from 'axe-result-converter/src/fingerprint-generator';
import { BaselineFileContent, BaselineOptions, UrlNormalizer } from './baseline-types';
import { BaselineEngine } from './baseline-engine';
import { BaselineGenerator } from './baseline-generator';

describe(BaselineEngine, () => {
    let baselineGeneratorMock: IMock<BaselineGenerator>;
    let fingerprintGeneratorMock: IMock<FingerprintGenerator>;
    let inputViolations: AxeResultsList;
    let inputResults: AxeCoreResults;
    let inputUrlNormalizer: UrlNormalizer;
    let inputOptions: BaselineOptions;
    let oldBaseline: BaselineFileContent;
    let newBaseline: BaselineFileContent;
    let testSubject: BaselineEngine;

    beforeEach(() => {
        baselineGeneratorMock = Mock.ofType<BaselineGenerator>(null, MockBehavior.Strict);
        fingerprintGeneratorMock = Mock.ofType<FingerprintGenerator>(null, MockBehavior.Strict);

        oldBaseline = {
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: '#some-id',
                    htmlSnippet: '<div id="some-id" />',
                    rule: 'rule-1',
                    urls: ['url-1'],
                },
            ],
        };
        newBaseline = {
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: '#some-id',
                    htmlSnippet: '<div id="some-id" />',
                    rule: 'rule-1',
                    urls: ['url-1', 'url-2'], // new URL
                },
            ],
        };

        inputUrlNormalizer = (x) => x;
        inputOptions = {
            baselineContent: oldBaseline,
            urlNormalizer: inputUrlNormalizer,
        };
        inputViolations = new AxeResultsList();
        inputResults = {
            violations: inputViolations,
        } as AxeCoreResults;

        testSubject = new BaselineEngine(baselineGeneratorMock.object, fingerprintGeneratorMock.object);
    });

    afterEach(() => {
        baselineGeneratorMock.verifyAll();
        fingerprintGeneratorMock.verifyAll();
    });

    const setupFingerprintMock = (): void => {
        fingerprintGeneratorMock
            .setup((m) => m.getFingerprint(It.isAny()))
            .returns((args: FingerprintParameters) => {
                const xpathPortion: string = args.xpathSelector ? `|${args.xpathSelector}` : '';

                return `${args.rule}|${args.snippet}|${args.cssSelector}${xpathPortion}`;
            })
            .verifiable(Times.atLeastOnce());
    };

    const setupBaselineResults = (baseline: BaselineFileContent): void => {
        const fingerprint = 'rule-1|<div id="some-id" />|#some-id';
        inputResults.violations.add(fingerprint, {
            urls: baseline.results[0].urls,
            urlInfos: [],
            fingerprint,
        } as AxeResult);

        baselineGeneratorMock.setup((m) => m.generateBaseline(inputResults.violations, inputUrlNormalizer)).returns(() => baseline);
    };

    describe('updateResultsInPlace', () => {
        it('propagates errors from the generator', () => {
            const generatorError = new Error('from BaselineGenerator');
            baselineGeneratorMock.setup((m) => m.generateBaseline(inputViolations, inputUrlNormalizer)).throws(generatorError);

            expect(() => testSubject.updateResultsInPlace(inputResults, inputOptions)).toThrowError(generatorError);
        });

        it("suggests the generator's output as a new baseline if there was no original baseline content", () => {
            setupFingerprintMock();
            inputOptions.baselineContent = null;
            setupBaselineResults(newBaseline);
            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);
            expect(evaluation.suggestedBaselineUpdate).toBe(newBaseline);
        });

        it("suggests the generator's output as a new baseline if it differs from the input baseline", () => {
            setupFingerprintMock();
            setupBaselineResults(newBaseline);
            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);
            expect(evaluation.suggestedBaselineUpdate).toBe(newBaseline);
        });

        it('suggests no baseline update if the baseline generator produces results identical to the input baseline', () => {
            setupFingerprintMock();
            setupBaselineResults(oldBaseline);
            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);
            expect(evaluation.suggestedBaselineUpdate).toBeNull();
        });
    });
});
