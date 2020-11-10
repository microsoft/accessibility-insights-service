// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { HashGenerator } from 'common';
import axe from 'axe-core';
import { AxeResultsReducer } from './axe-results-reducer';
import { AxeResult, AxeCoreResults } from './axe-result-types';

let hashGeneratorMock: IMock<HashGenerator>;
let axeResultsReducer: AxeResultsReducer;
const accumulatedResultsFn = (id: string, nodeId: string = id) =>
    [
        {
            id: `id-${id}`,
            nodes: [
                {
                    html: `snippet-${nodeId}`,
                    target: [`selector-${nodeId}`],
                    selectors: [{ selector: `selector-${nodeId}`, type: 'css' }],
                    fingerprint: `snippet-${nodeId}|selector-${nodeId}`,
                },
            ],
        },
    ] as AxeResult[];
const currentResultsFn = (id: string, nodeId: string = id) =>
    [
        {
            id: `id-${id}`,
            nodes: [
                {
                    html: `snippet-${nodeId}`,
                    target: [`selector-${nodeId}`],
                },
            ],
        },
    ] as axe.Result[];

describe(AxeResultsReducer, () => {
    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        hashGeneratorMock
            .setup((o) => o.generateBase64Hash(It.isAny(), It.isAny()))
            .returns((...args: string[]) => {
                return args.join('|');
            })
            .verifiable(Times.atLeastOnce());
        axeResultsReducer = new AxeResultsReducer(hashGeneratorMock.object);
    });

    afterEach(() => {
        hashGeneratorMock.verifyAll();
    });

    it('reduce axe core results', () => {
        const accumulatedAxeCoreResults = {
            passes: accumulatedResultsFn('passes-1'),
            violations: accumulatedResultsFn('violations-1'),
            incomplete: accumulatedResultsFn('incomplete-1'),
            inapplicable: [{ id: 'inapplicable-1' }],
        } as AxeCoreResults;
        const currentAxeCoreResults = {
            passes: currentResultsFn('passes-2'),
            violations: currentResultsFn('violations-2'),
            incomplete: currentResultsFn('incomplete-2'),
            inapplicable: [{ id: 'inapplicable-2' }],
        } as axe.AxeResults;
        const expectedAxeCoreResults = {
            passes: [...accumulatedAxeCoreResults.passes, ...accumulatedResultsFn('passes-2')],
            violations: [...accumulatedAxeCoreResults.violations, ...accumulatedResultsFn('violations-2')],
            incomplete: [...accumulatedAxeCoreResults.incomplete, ...accumulatedResultsFn('incomplete-2')],
            inapplicable: [...accumulatedAxeCoreResults.inapplicable, ...currentAxeCoreResults.inapplicable],
        } as AxeCoreResults;

        axeResultsReducer.reduce(accumulatedAxeCoreResults, currentAxeCoreResults);

        expect(accumulatedAxeCoreResults).toEqual(expectedAxeCoreResults);
    });

    it('reduce results', () => {
        const accumulatedResults = [...accumulatedResultsFn('rule-1'), ...accumulatedResultsFn('rule-2')] as AxeResult[];
        const currentResults = [
            ...currentResultsFn('rule-1'),
            {
                id: 'id-rule-3',
                nodes: [...currentResultsFn('rule-3')[0].nodes, ...currentResultsFn('rule-3', 'node-4')[0].nodes],
            },
        ] as axe.Result[];
        const expectedResults = [
            ...accumulatedResultsFn('rule-1'),
            ...accumulatedResultsFn('rule-2'),
            ...accumulatedResultsFn('rule-3'),
            ...accumulatedResultsFn('rule-3', 'node-4'),
        ];

        axeResultsReducer.reduceResults(accumulatedResults, currentResults);

        expect(accumulatedResults).toEqual(expectedResults);
    });
});
