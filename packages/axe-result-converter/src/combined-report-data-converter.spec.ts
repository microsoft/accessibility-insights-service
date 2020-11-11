// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CombinedReportDataConverter } from './combined-report-data-converter';
import { AxeResult, AxeNodeResult, AxeCoreResults } from './axe-result-types';
import { ScanResultData } from './scan-result-data';

let combinedReportDataConverter: CombinedReportDataConverter;

const scanResultData = {
    baseUrl: 'baseUrl',
    basePageTitle: 'basePageTitle',
    scanEngineName: 'scanEngineName',
    axeCoreVersion: 'axeCoreVersion',
    browserUserAgent: 'browserUserAgent',
    scanStarted: new Date(1000),
    scanEnded: new Date(60000),
} as ScanResultData;
const accumulatedNodeFn = (ruleId: string, nodeId: string) => {
    return {
        any: [
            {
                id: `check-id-${nodeId}`,
                data: `check-data-${nodeId}`,
                message: `check-message-${nodeId}`,
            },
        ],
        all: [],
        none: [],
        failureSummary: `failureSummary-${nodeId}`,
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
            tags: [`tag-${ruleId}`],
            description: `description-${ruleId}`,
            helpUrl: `helpUrl-${ruleId}`,
            urls: data.urls,
            nodes: data.nodeId ? [accumulatedNodeFn(`id-${ruleId}`, data.nodeId)] : [],
        },
    ] as AxeResult[];

describe(CombinedReportDataConverter, () => {
    beforeEach(() => {
        combinedReportDataConverter = new CombinedReportDataConverter();
    });

    it('convert axe results to combined report data', () => {
        const violations = [
            ...accumulatedResultsFn('rule-1', { urls: ['url-11'], nodeId: 'node-11' }),
            ...accumulatedResultsFn('rule-2', { urls: ['url-21', 'url-22'], nodeId: 'node-12' }),
            ...accumulatedResultsFn('rule-2', { urls: ['url-21'], nodeId: 'node-22' }),
            ...accumulatedResultsFn('rule-3', { urls: ['url-31', 'url-32', 'url-33'], nodeId: 'node-31' }),
            ...accumulatedResultsFn('rule-3', { urls: ['url-31', 'url-32'], nodeId: 'node-32' }),
            ...accumulatedResultsFn('rule-3', { urls: ['url-31'], nodeId: 'node-33' }),
        ];
        const passes = [
            ...accumulatedResultsFn('rule-21', { urls: ['url-21'], nodeId: 'node-21' }),
            ...accumulatedResultsFn('rule-22', { urls: ['url-22'], nodeId: 'node-22' }),
        ];
        const incomplete = [
            ...accumulatedResultsFn('rule-31', { urls: ['url-31'], nodeId: 'node-31' }),
            ...accumulatedResultsFn('rule-32', { urls: ['url-32'], nodeId: 'node-32' }),
        ];
        const inapplicable = [
            ...accumulatedResultsFn('rule-41', { urls: ['url-41'] }),
            ...accumulatedResultsFn('rule-42', { urls: ['url-42'] }),
        ];
        const axeCoreResults = {
            violations,
            passes,
            incomplete,
            inapplicable,
        } as AxeCoreResults;

        const combinedReportData = combinedReportDataConverter.convert(axeCoreResults, scanResultData);

        expect(combinedReportData).toMatchSnapshot();
    });
});
