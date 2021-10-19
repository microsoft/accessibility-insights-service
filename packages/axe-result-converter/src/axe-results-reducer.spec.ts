// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { HashGenerator } from 'common';
import axe from 'axe-core';
import { UrlInfo } from 'accessibility-insights-report';
import { AxeResultsReducer } from './axe-results-reducer';
import { AxeResult, AxeNodeResult, AxeCoreResults, AxeResultsList } from './axe-result-types';
import { FingerprintGenerator, FingerprintParameters } from './fingerprint-generator';

let hashGeneratorMock: IMock<HashGenerator>;
let fingerprintGeneratorMock: IMock<FingerprintGenerator>;
let axeResultsReducer: AxeResultsReducer;

const getAccumulatedNode = (nodeId: string) => {
    return {
        html: `snippet-${nodeId}`,
        target: [`selector-${nodeId}`],
        selectors: [{ selector: `selector-${nodeId}`, type: 'css' }],
    } as AxeNodeResult;
};
const getAccumulatedResult = (ruleId: string, data: { urls: string[]; urlInfos: UrlInfo[]; nodeId?: string }) => {
    return {
        id: `id-${ruleId}`,
        urls: data.urls,
        urlInfos: data.urlInfos,
        nodes: [],
        junctionNode: data.nodeId ? getAccumulatedNode(data.nodeId) : undefined,
        fingerprint: data.nodeId ? `id-${ruleId}|snippet-${data.nodeId}|selector-${data.nodeId}` : `id-${ruleId}`,
    } as AxeResult;
};
const addAxeResult = (axeResults: AxeResultsList, ...axeResultList: AxeResult[]): AxeResultsList => {
    axeResultList.forEach((axeResult) => axeResults.add(axeResult.fingerprint, axeResult));

    return axeResults;
};
const getCurrentNode = (nodeId: string) => {
    return {
        html: `snippet-${nodeId}`,
        target: [`selector-${nodeId}`],
    } as axe.NodeResult;
};
const getCurrentResults = (ruleId: string, ...nodeIds: string[]) =>
    [
        {
            id: `id-${ruleId}`,
            nodes: nodeIds?.map(getCurrentNode),
        },
    ] as axe.Result[];
const setupRuleHash = () => {
    hashGeneratorMock
        .setup((o) => o.generateBase64Hash(It.isAny()))
        .returns((args: string) => {
            return args;
        })
        .verifiable(Times.atLeastOnce());
};
describe(AxeResultsReducer, () => {
    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        fingerprintGeneratorMock = Mock.ofType<FingerprintGenerator>();
        fingerprintGeneratorMock
            .setup((o) => o.getFingerprint(It.isAny()))
            .returns((args: FingerprintParameters) => {
                return `${args.rule}|${args.snippet}|${args.cssSelector}`;
            });
        axeResultsReducer = new AxeResultsReducer(hashGeneratorMock.object, fingerprintGeneratorMock.object);
    });

    afterEach(() => {
        hashGeneratorMock.verifyAll();
        fingerprintGeneratorMock.verifyAll();
    });

    it('reduce axe result', () => {
        const url = 'url-1';
        const accumulatedResults = {
            violations: new AxeResultsList(),
            passes: new AxeResultsList(),
            incomplete: new AxeResultsList(),
            inapplicable: new AxeResultsList(),
        } as AxeCoreResults;
        const violations = getCurrentResults('rule-1', 'node-11');
        const passes = getCurrentResults('rule-2', 'node-21');
        const incomplete = getCurrentResults('rule-3', 'node-31');
        const inapplicable = getCurrentResults('rule-4');

        const expectedViolations = [getAccumulatedResult('rule-1', { urls: [url], urlInfos: [{url}], nodeId: 'node-11' })];
        const expectedPasses = [getAccumulatedResult('rule-2', { urls: [url], urlInfos: [{url}], nodeId: 'node-21' })];
        const expectedIncomplete = [getAccumulatedResult('rule-3', { urls: [url], urlInfos: [{url}], nodeId: 'node-31' })];
        const expectedInapplicable = [getAccumulatedResult('rule-4', { urls: [url], urlInfos: [{url}] })];

        setupRuleHash();

        axeResultsReducer.reduce(accumulatedResults, { url, violations, passes, incomplete, inapplicable } as axe.AxeResults);

        expect(accumulatedResults.violations.values()).toEqual(expectedViolations);
        expect(accumulatedResults.passes.values()).toEqual(expectedPasses);
        expect(accumulatedResults.incomplete.values()).toEqual(expectedIncomplete);
        expect(accumulatedResults.inapplicable.values()).toEqual(expectedInapplicable);
    });

    it('reduce result without nodes', () => {
        const currentUrl = 'url-2';
        const accumulatedResults = addAxeResult(new AxeResultsList(), getAccumulatedResult('rule-1', { urls: ['url-1'], urlInfos: [{url: 'url-1'}]  }));
        const currentResults = getCurrentResults('rule-1');
        const expectedResults = [getAccumulatedResult('rule-1', { urls: ['url-1', currentUrl], urlInfos: [{url: 'url-1'}, {url: currentUrl}] })];

        setupRuleHash();

        axeResultsReducer.reduce(
            { inapplicable: accumulatedResults } as AxeCoreResults,
            { url: currentUrl, inapplicable: currentResults } as axe.AxeResults,
        );

        expect(accumulatedResults.values()).toEqual(expectedResults);
    });

    it('skip same rule node', () => {
        const currentUrl = 'url-2';
        const accumulatedResults = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult('rule-1', { urls: ['url-1'], urlInfos: [{url: 'url-1'}], nodeId: 'node-1' }),
        );
        const currentResults = getCurrentResults('rule-1', 'node-1', 'node-2', 'node-3');
        const expectedResults = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult('rule-1', { urls: ['url-1', currentUrl], urlInfos: [{url: 'url-1'}, {url: currentUrl}], nodeId: 'node-1' }),
            getAccumulatedResult('rule-1', { urls: [currentUrl], urlInfos: [{url: currentUrl}], nodeId: 'node-2' }),
            getAccumulatedResult('rule-1', { urls: [currentUrl], urlInfos: [{url: currentUrl}], nodeId: 'node-3' }),
        );

        axeResultsReducer.reduce(
            { violations: accumulatedResults } as AxeCoreResults,
            { url: currentUrl, violations: currentResults } as axe.AxeResults,
        );

        expect(accumulatedResults.values()).toEqual(expectedResults.values());
    });

    it('split multiple nodes from a single result', () => {
        const currentUrl = 'url-1';
        const accumulatedResults = new AxeResultsList();
        const currentResults = getCurrentResults('rule-1', 'node-1', 'node-2', 'node-3');
        const expectedResults = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult('rule-1', { urls: [currentUrl], urlInfos: [{url: currentUrl}], nodeId: 'node-1' }),
            getAccumulatedResult('rule-1', { urls: [currentUrl], urlInfos: [{url: currentUrl}], nodeId: 'node-2' }),
            getAccumulatedResult('rule-1', { urls: [currentUrl], urlInfos: [{url: currentUrl}], nodeId: 'node-3' }),
        );

        axeResultsReducer.reduce(
            { violations: accumulatedResults } as AxeCoreResults,
            { url: currentUrl, violations: currentResults } as axe.AxeResults,
        );

        expect(accumulatedResults.values()).toEqual(expectedResults.values());
    });
});
