// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { FingerprintGenerator, FingerprintParameters } from '../converter/fingerprint-generator';
import { AxeCoreResults, AxeResult, AxeResultsList } from '../converter/axe-result-types';
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
    let baselineContentWithNoViolations: BaselineFileContent;
    let baselineContentWithSingleViolation: BaselineFileContent;
    let baselineContentWithRuleViolationsBeforeAndAfterSingleViolation: BaselineFileContent;
    let baselineContentWithMultipleRuleViolations: BaselineFileContent;
    let baselineContentWithMutipleComplexChanges: BaselineFileContent;
    let testSubject: BaselineEngine;

    beforeEach(() => {
        baselineGeneratorMock = Mock.ofType<BaselineGenerator>(null, MockBehavior.Strict);
        fingerprintGeneratorMock = Mock.ofType<FingerprintGenerator>(null, MockBehavior.Strict);

        baselineContentWithNoViolations = {
            metadata: { fileFormatVersion: '1' },
            results: [],
        };
        baselineContentWithSingleViolation = {
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
        baselineContentWithMultipleRuleViolations = {
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: '#some-id',
                    htmlSnippet: '<div id="some-id" />',
                    rule: 'rule-1',
                    urls: ['url-1', 'url-2'], // new URL
                },
                {
                    // new rule
                    cssSelector: '#another-id',
                    htmlSnippet: '<div id-"another-id" />',
                    rule: 'rule-2',
                    urls: ['url-2'],
                },
            ],
        };
        baselineContentWithMutipleComplexChanges = {
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: '#some-id',
                    htmlSnippet: '<div id="some-id" />',
                    rule: 'rule-1',
                    urls: ['url-1', 'url-2', 'url-3'], // new URL
                },
                {
                    // this rule replaces rule-2
                    cssSelector: '#yet-another-id',
                    htmlSnippet: '<div id-"yet-another-id" />',
                    rule: 'rule-3',
                    urls: ['url-3'],
                },
            ],
        };
        baselineContentWithRuleViolationsBeforeAndAfterSingleViolation = {
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: '#some-id-0',
                    htmlSnippet: '<div id="some-id-0" />',
                    rule: 'rule-0',
                    urls: ['url-0'],
                },
                {
                    cssSelector: '#some-id',
                    htmlSnippet: '<div id="some-id" />',
                    rule: 'rule-1',
                    urls: ['url-1'],
                },
                {
                    cssSelector: '#some-id-2',
                    htmlSnippet: '<div id="some-id-2" />',
                    rule: 'rule-2',
                    urls: ['url-2'],
                },
            ],
        };

        inputUrlNormalizer = (x) => x;
        inputOptions = {
            baselineContent: null,
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

    const setupCurrentScanContents = (baseline: BaselineFileContent): void => {
        for (const result of baseline.results) {
            const fingerprint = `${result.rule}|${result.htmlSnippet}|${result.cssSelector}`;
            inputResults.violations.add(fingerprint, {
                urls: result.urls,
                urlInfos: [],
                fingerprint,
            } as AxeResult);
        }

        baselineGeneratorMock.setup((m) => m.generateBaseline(inputResults.violations, inputUrlNormalizer)).returns(() => baseline);
    };

    const setupBaselineScanContents = (baseline: BaselineFileContent): void => {
        inputOptions.baselineContent = baseline;
    };

    describe('updateResultsInPlace', () => {
        it('propagates errors from the generator', () => {
            const generatorError = new Error('from BaselineGenerator');
            baselineGeneratorMock.setup((m) => m.generateBaseline(inputViolations, inputUrlNormalizer)).throws(generatorError);

            expect(() => testSubject.updateResultsInPlace(inputResults, inputOptions)).toThrowError(generatorError);
        });

        it('reports a different output if the file format version changes', () => {
            const baselineContentWithDifferentFileFormatVersion: BaselineFileContent = {
                metadata: { fileFormatVersion: '1.1' },
                results: [],
            } as unknown as BaselineFileContent;
            setupCurrentScanContents(baselineContentWithDifferentFileFormatVersion);
            setupBaselineScanContents(baselineContentWithNoViolations);

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBe(baselineContentWithDifferentFileFormatVersion);
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });

        it('Scan with no violations when no baseline content exists', () => {
            setupCurrentScanContents(baselineContentWithNoViolations);
            setupBaselineScanContents(null);

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBe(baselineContentWithNoViolations);
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });

        it('Scan with violations when no baseline content exists', () => {
            setupCurrentScanContents(baselineContentWithMultipleRuleViolations);
            setupBaselineScanContents(null);
            setupFingerprintMock();

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBe(baselineContentWithMultipleRuleViolations);
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });

        it('current scan has more errors than baseline content', () => {
            setupCurrentScanContents(baselineContentWithMultipleRuleViolations);
            setupBaselineScanContents(baselineContentWithSingleViolation);
            setupFingerprintMock();

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBe(baselineContentWithMultipleRuleViolations);
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });

        it('current scan content is identical to baseline content', () => {
            setupCurrentScanContents(baselineContentWithMultipleRuleViolations);
            setupBaselineScanContents(baselineContentWithMultipleRuleViolations);
            setupFingerprintMock();

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBeNull();
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });

        it('current scan content has fewer errors than baseline content', () => {
            setupCurrentScanContents(baselineContentWithSingleViolation);
            setupBaselineScanContents(baselineContentWithMultipleRuleViolations);
            setupFingerprintMock();

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBe(baselineContentWithSingleViolation);
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });

        it('current scan content has complex differences compared to baseline content', () => {
            setupCurrentScanContents(baselineContentWithMutipleComplexChanges);
            setupBaselineScanContents(baselineContentWithMultipleRuleViolations);
            setupFingerprintMock();

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBe(baselineContentWithMutipleComplexChanges);
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });

        it('current scan content has new failures before and after baseline content', () => {
            setupCurrentScanContents(baselineContentWithRuleViolationsBeforeAndAfterSingleViolation);
            setupBaselineScanContents(baselineContentWithSingleViolation);
            setupFingerprintMock();

            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);

            expect(evaluation.suggestedBaselineUpdate).toBe(baselineContentWithRuleViolationsBeforeAndAfterSingleViolation);
            expect({ evaluation: evaluation, axeResults: inputResults }).toMatchSnapshot();
        });
    });
});
