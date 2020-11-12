// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { HashGenerator } from 'common';
import axe from 'axe-core';
import { AxeResultsReducer } from './axe-results-reducer';
import { AxeResult, AxeNodeResult, AxeCoreResults } from './axe-result-types';

let hashGeneratorMock: IMock<HashGenerator>;
let axeResultsReducer: AxeResultsReducer;

const accumulatedNodeFn = (ruleId: string, nodeId: string) => {
    return {
        html: `snippet-${nodeId}`,
        target: [`selector-${nodeId}`],
        selectors: [{ selector: `selector-${nodeId}`, type: 'css' }],
        fingerprint: `${ruleId}|snippet-${nodeId}|selector-${nodeId}`,
    } as AxeNodeResult;
};
const accumulatedResultsFn = (ruleId: string, data: { urls: string[]; nodeId?: string }) =>
    [
        {
            id: `id-${ruleId}`,
            urls: data.urls,
            nodes: data.nodeId ? [accumulatedNodeFn(`id-${ruleId}`, data.nodeId)] : [],
        },
    ] as AxeResult[];
const currentNodeFn = (nodeId: string) => {
    return {
        html: `snippet-${nodeId}`,
        target: [`selector-${nodeId}`],
    } as axe.NodeResult;
};
const currentResultsFn = (ruleId: string, ...nodeIds: string[]) =>
    [
        {
            id: `id-${ruleId}`,
            nodes: nodeIds?.map(currentNodeFn),
        },
    ] as axe.Result[];

describe(AxeResultsReducer, () => {
    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        hashGeneratorMock
            .setup((o) => o.generateBase64Hash(It.isAny(), It.isAny(), It.isAny()))
            .returns((...args: string[]) => {
                return args.join('|');
            })
            .verifiable(Times.atLeastOnce());
        axeResultsReducer = new AxeResultsReducer(hashGeneratorMock.object);
    });

    afterEach(() => {
        hashGeneratorMock.verifyAll();
    });

    it('reduce axe result', () => {
        const url = 'url-1';
        const accumulatedResults = { violations: [], passes: [], incomplete: [], inapplicable: [] } as AxeCoreResults;
        const violations = currentResultsFn('rule-1', 'node-11');
        const passes = currentResultsFn('rule-2', 'node-21');
        const incomplete = currentResultsFn('rule-3', 'node-31');
        const inapplicable = currentResultsFn('rule-4');

        const expectedViolations = accumulatedResultsFn('rule-1', { urls: [url], nodeId: 'node-11' });
        const expectedPasses = accumulatedResultsFn('rule-2', { urls: [url], nodeId: 'node-21' });
        const expectedIncomplete = accumulatedResultsFn('rule-3', { urls: [url], nodeId: 'node-31' });
        const expectedInapplicable = accumulatedResultsFn('rule-4', { urls: [url] });
        const expectedResults = {
            urls: [url],
            violations: expectedViolations,
            passes: expectedPasses,
            incomplete: expectedIncomplete,
            inapplicable: expectedInapplicable,
        };

        axeResultsReducer.reduce(accumulatedResults, { url, violations, passes, incomplete, inapplicable } as axe.AxeResults);

        expect(accumulatedResults).toEqual(expectedResults);
    });

    it('reduce result without nodes', () => {
        hashGeneratorMock.reset();

        const currentUrl = 'url-2';
        const accumulatedResults = accumulatedResultsFn('rule-1', { urls: ['url-1'] });
        const currentResults = currentResultsFn('rule-1');
        const expectedResults = [...accumulatedResultsFn('rule-1', { urls: ['url-1', currentUrl] })];

        axeResultsReducer.reduce(
            { inapplicable: accumulatedResults } as AxeCoreResults,
            { url: currentUrl, inapplicable: currentResults } as axe.AxeResults,
        );

        expect(accumulatedResults).toEqual(expectedResults);
    });

    it('skip same rule node', () => {
        const currentUrl = 'url-2';
        const accumulatedResults = accumulatedResultsFn('rule-1', { urls: ['url-1'], nodeId: 'node-1' });
        const currentResults = currentResultsFn('rule-1', 'node-1', 'node-2', 'node-3');
        const expectedResults = [
            ...accumulatedResultsFn('rule-1', { urls: ['url-1', currentUrl], nodeId: 'node-1' }),
            ...accumulatedResultsFn('rule-1', { urls: [currentUrl], nodeId: 'node-2' }),
            ...accumulatedResultsFn('rule-1', { urls: [currentUrl], nodeId: 'node-3' }),
        ];

        axeResultsReducer.reduce(
            { violations: accumulatedResults } as AxeCoreResults,
            { url: currentUrl, violations: currentResults } as axe.AxeResults,
        );

        expect(accumulatedResults).toEqual(expectedResults);
    });

    it('split multiple nodes from a single result', () => {
        const currentUrl = 'url-1';
        const accumulatedResults = [] as AxeResult[];
        const currentResults = currentResultsFn('rule-1', 'node-1', 'node-2', 'node-3');
        const expectedResults = [
            ...accumulatedResultsFn('rule-1', { urls: [currentUrl], nodeId: 'node-1' }),
            ...accumulatedResultsFn('rule-1', { urls: [currentUrl], nodeId: 'node-2' }),
            ...accumulatedResultsFn('rule-1', { urls: [currentUrl], nodeId: 'node-3' }),
        ];

        axeResultsReducer.reduce(
            { violations: accumulatedResults } as AxeCoreResults,
            { url: currentUrl, violations: currentResults } as axe.AxeResults,
        );

        expect(accumulatedResults).toEqual(expectedResults);
    });
});
