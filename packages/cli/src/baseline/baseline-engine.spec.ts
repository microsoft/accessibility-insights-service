// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, MockBehavior } from 'typemoq';
import { AxeCoreResults, AxeResultsList } from 'axe-result-converter';
import { BaselineFileContent, BaselineOptions, UrlNormalizer } from './baseline-types';
import { BaselineEngine } from './baseline-engine';
import { BaselineGenerator } from './baseline-generator';

describe(BaselineEngine, () => {
    let baselineGeneratorMock: IMock<BaselineGenerator>;
    let inputViolations: AxeResultsList;
    let inputResults: AxeCoreResults;
    let inputUrlNormalizer: UrlNormalizer;
    let inputOptions: BaselineOptions;
    let oldBaseline: BaselineFileContent;
    let newBaseline: BaselineFileContent;
    let testSubject: BaselineEngine;

    beforeEach(() => {
        baselineGeneratorMock = Mock.ofType<BaselineGenerator>(null, MockBehavior.Strict);

        oldBaseline = {
            metadata: { fileFormatVersion: '1' },
            results: [{
                cssSelector: '#some-id',
                htmlSnippet: '<div id="some-id" />',
                rule: 'rule-1',
                urls: ['url-1'],
            }],
        };
        newBaseline = {
            metadata: { fileFormatVersion: '1' },
            results: [{
                cssSelector: '#some-id',
                htmlSnippet: '<div id="some-id" />',
                rule: 'rule-1',
                urls: ['url-1', 'url-2'], // new URL
            }],
        };

        inputUrlNormalizer = x => x;
        inputOptions = {
            baselineContent: oldBaseline,
            urlNormalizer: inputUrlNormalizer,
        };
        inputViolations = new AxeResultsList();
        inputResults = {
            violations: inputViolations,
        } as AxeCoreResults;

        testSubject = new BaselineEngine(baselineGeneratorMock.object);
    });

    afterEach(() => {
        baselineGeneratorMock.verifyAll();
    });

    describe('updateResultsInPlace', () => {
        it('propagates errors from the generator', () => {
            const generatorError = new Error('from BaselineGenerator');
            baselineGeneratorMock
                .setup(m => m.generateBaseline(inputViolations, inputUrlNormalizer))
                .throws(generatorError);

            expect(() => testSubject.updateResultsInPlace(inputResults, inputOptions)).toThrowError(generatorError);
        });

        it("suggests the generator's output as a new baseline if there was no original baseline content", () => {
            inputOptions.baselineContent = null;
            baselineGeneratorMock
                .setup(m => m.generateBaseline(inputViolations, inputUrlNormalizer))
                .returns(() => newBaseline);
            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);
            expect(evaluation.suggestedBaselineUpdate).toBe(newBaseline);
        });

        it("suggests the generator's output as a new baseline if it differs from the input baseline", () => {
            baselineGeneratorMock
                .setup(m => m.generateBaseline(inputViolations, inputUrlNormalizer))
                .returns(() => newBaseline);
            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);
            expect(evaluation.suggestedBaselineUpdate).toBe(newBaseline);
        });

        it('suggests no baseline update if the baseline generator produces results identical to the input baseline', () => {
            baselineGeneratorMock
                .setup(m => m.generateBaseline(inputViolations, inputUrlNormalizer))
                .returns(() => oldBaseline);
            const evaluation = testSubject.updateResultsInPlace(inputResults, inputOptions);
            expect(evaluation.suggestedBaselineUpdate).toBeNull();
        });
    });
});
