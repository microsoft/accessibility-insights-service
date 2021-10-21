// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { slice } from 'lodash';
import { AxeResult, AxeResultsList } from 'axe-result-converter';
import { BaselineResult, UrlNormalizer } from './baseline-types';
import { BaselineGenerator } from './baseline-generator';

describe(BaselineGenerator, () => {
    const cssSelector = '#some-id';
    const xpathSelector = '/path/to/div';
    const htmlSnippet = '<div id="some-id" />';
    const rule = 'rule-1';
    const originalUrls = ['url-1', 'url-2'];
    const uppercaseUrlNormalizer: UrlNormalizer = (url) => url.toUpperCase();
    const uppercaseUrls = ['URL-1', 'URL-2'];
    const validCssOnlyJunctionNode: AxeResult['junctionNode'] = {
        selectors: [{ type: 'css', selector: cssSelector }],
        html: htmlSnippet,
        target: [],
        any: [],
        all: [],
        none: [],
    };
    const validCssAndXpathJunctionNode: AxeResult['junctionNode'] = {
        ...validCssOnlyJunctionNode,
        selectors: [
            { type: 'css', selector: cssSelector },
            { type: 'xpath', selector: xpathSelector },
        ],
    };
    const validCssOnlyAxeResult: AxeResult = {
        urls: originalUrls,
        urlInfos: [],
        description: 'description',
        help: 'help',
        fingerprint: 'fingerprint',
        helpUrl: 'http://help.url',
        id: rule,
        tags: [],
        nodes: [],
        junctionNode: validCssOnlyJunctionNode,
    };
    const validCssAndXpathAxeResult: AxeResult = {
        ...validCssOnlyAxeResult,
        junctionNode: validCssAndXpathJunctionNode,
    };

    let testSubject: BaselineGenerator;

    beforeEach(() => {
        testSubject = new BaselineGenerator();
    });

    it('generates the expected baseline content for a valid css-only result', () => {
        const results = new AxeResultsList();
        results.add('fingerprint-1', validCssOnlyAxeResult);

        const baseline = testSubject.generateBaseline(results);

        expect(baseline).toStrictEqual({
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: cssSelector,
                    htmlSnippet: htmlSnippet,
                    urls: originalUrls,
                    rule: rule,
                },
            ],
        });
    });

    it('generates the expected baseline content for a valid xpath-only result', () => {
        const results = new AxeResultsList();
        results.add('fingerprint-1', validCssAndXpathAxeResult);

        const baseline = testSubject.generateBaseline(results);

        expect(baseline).toStrictEqual({
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: cssSelector,
                    xpathSelector: xpathSelector,
                    htmlSnippet: htmlSnippet,
                    urls: originalUrls,
                    rule: rule,
                },
            ],
        });
    });

    it('applies the urlNormalizer to all URLs in the baseline', () => {
        const results = new AxeResultsList();
        results.add('fingerprint-1', validCssAndXpathAxeResult);

        const baseline = testSubject.generateBaseline(results, uppercaseUrlNormalizer);

        expect(baseline).toStrictEqual({
            metadata: { fileFormatVersion: '1' },
            results: [
                {
                    cssSelector: cssSelector,
                    xpathSelector: xpathSelector,
                    htmlSnippet: htmlSnippet,
                    urls: uppercaseUrls,
                    rule: rule,
                },
            ],
        });
    });

    it('sorts results by [rule, cssSelector, xpathSelector, htmlSnippet]', () => {
        const resultTuplesInExpectedOrder = [
            ['rule-a', 'css-a', 'xpath-a', 'html-a'],
            ['rule-a', 'css-a', 'xpath-a', 'html-b'],
            ['rule-a', 'css-a', 'xpath-b', 'html-a'],
            ['rule-a', 'css-a', 'xpath-b', 'html-b'],
            ['rule-a', 'css-a', undefined, 'html-a'],
            ['rule-a', 'css-a', undefined, 'html-b'],
            ['rule-a', 'css-b', 'xpath-a', 'html-a'],
            ['rule-a', 'css-b', 'xpath-a', 'html-b'],
            ['rule-a', 'css-b', 'xpath-b', 'html-a'],
            ['rule-a', 'css-b', 'xpath-b', 'html-b'],
            ['rule-a', 'css-b', undefined, 'html-a'],
            ['rule-a', 'css-b', undefined, 'html-b'],
            ['rule-b', 'css-a', 'xpath-a', 'html-a'],
            ['rule-b', 'css-a', 'xpath-a', 'html-b'],
            ['rule-b', 'css-a', 'xpath-b', 'html-a'],
            ['rule-b', 'css-a', 'xpath-b', 'html-b'],
            ['rule-b', 'css-a', undefined, 'html-a'],
            ['rule-b', 'css-a', undefined, 'html-b'],
            ['rule-b', 'css-b', 'xpath-a', 'html-a'],
            ['rule-b', 'css-b', 'xpath-a', 'html-b'],
            ['rule-b', 'css-b', 'xpath-b', 'html-a'],
            ['rule-b', 'css-b', 'xpath-b', 'html-b'],
            ['rule-b', 'css-b', undefined, 'html-a'],
            ['rule-b', 'css-b', undefined, 'html-b'],
        ];

        const expectedBaselineResults: BaselineResult[] = resultTuplesInExpectedOrder.map((tuple) => {
            const result: BaselineResult = {
                cssSelector: tuple[1],
                htmlSnippet: tuple[3],
                rule: tuple[0],
                urls: originalUrls,
            };
            if (tuple[2] != null) {
                result.xpathSelector = tuple[2];
            }

            return result;
        });

        const resultTuplesInArbitraryIncorrectOrder = [
            ...slice(resultTuplesInExpectedOrder, 8, resultTuplesInExpectedOrder.length),
            ...slice(resultTuplesInExpectedOrder, 5, 8),
            ...slice(resultTuplesInExpectedOrder, 0, 5),
        ];

        const inputResults = new AxeResultsList();
        for (const resultTuple of resultTuplesInArbitraryIncorrectOrder) {
            const fingerprint = `${resultTuple[1]}-${resultTuple[2]}-${resultTuple[3]}-${resultTuple[0]}`;
            const result: AxeResult = {
                ...validCssOnlyAxeResult,
                id: resultTuple[0],
                junctionNode: {
                    ...validCssOnlyJunctionNode,
                    html: resultTuple[3],
                    selectors: [{ type: 'css', selector: resultTuple[1] }],
                },
            };
            if (resultTuple[2] != null) {
                result.junctionNode.selectors.push({ type: 'xpath', selector: resultTuple[2] });
            }
            inputResults.add(fingerprint, result);
        }

        const baseline = testSubject.generateBaseline(inputResults);

        expect(baseline).toStrictEqual({
            metadata: { fileFormatVersion: '1' },
            results: expectedBaselineResults,
        });
    });

    it('sorts urls lexographically', () => {
        const results = new AxeResultsList();
        const resultWithMisorderedUrls = {
            ...validCssOnlyAxeResult,
            urls: ['url-b', 'url-c', 'url-a'],
        };
        results.add('fingerprint-1', resultWithMisorderedUrls);

        const baseline = testSubject.generateBaseline(results);

        expect(baseline.results[0].urls).toStrictEqual(['url-a', 'url-b', 'url-c']);
    });

    it('throws an Error if a result does not contain a junctionNode', () => {
        const results = new AxeResultsList();
        results.add('fingerprint', {
            ...validCssAndXpathAxeResult,
            junctionNode: undefined,
        });

        expect(() => testSubject.generateBaseline(results)).toThrowErrorMatchingInlineSnapshot(
            `"Invalid input result; does not contain a junctionNode"`,
        );
    });

    it('throws an Error if a result does not contain a css selector', () => {
        const results = new AxeResultsList();
        results.add('fingerprint', {
            ...validCssAndXpathAxeResult,
            junctionNode: {
                ...validCssAndXpathJunctionNode,
                selectors: [{ type: 'xpath', selector: '/path' }],
            },
        });

        expect(() => testSubject.generateBaseline(results)).toThrowErrorMatchingInlineSnapshot(
            `"Invalid input result; does not contain a css selector"`,
        );
    });
});
