// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CombinedReportDataConverter } from './combined-report-data-converter';
import { AxeResult, AxeNodeResult, AxeCoreResults, AxeResults } from './axe-result-types';
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
    urlCount: {
        total: 7,
        passed: 3,
        failed: 1,
    },
} as ScanResultData;
const getAccumulatedNode = (nodeId: string) => {
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
    } as AxeNodeResult;
};
const getAccumulatedResult = (ruleId: string, data: { urls: string[]; nodeId?: string }) => {
    return {
        id: `id-${ruleId}`,
        tags: [`tag-${ruleId}`],
        description: `description-${ruleId}`,
        helpUrl: `helpUrl-${ruleId}`,
        urls: data.urls,
        nodes: [],
        junctionNode: data.nodeId ? getAccumulatedNode(data.nodeId) : undefined,
        fingerprint: data.nodeId ? `id-${ruleId}|snippet-${data.nodeId}|selector-${data.nodeId}` : `id-${ruleId}`,
    } as AxeResult;
};
const addAxeResult = (axeResults: AxeResults, ...axeResultList: AxeResult[]): AxeResults => {
    axeResultList.forEach((axeResult) => axeResults.add(axeResult.fingerprint, axeResult));

    return axeResults;
};

describe(CombinedReportDataConverter, () => {
    beforeEach(() => {
        combinedReportDataConverter = new CombinedReportDataConverter();
    });

    it('convert axe results to combined report data', () => {
        const violations = addAxeResult(
            new AxeResults(),
            getAccumulatedResult('rule-1', { urls: ['url-11'], nodeId: 'node-11' }),
            getAccumulatedResult('rule-2', { urls: ['url-21', 'url-22'], nodeId: 'node-12' }),
            getAccumulatedResult('rule-2', { urls: ['url-21'], nodeId: 'node-22' }),
            getAccumulatedResult('rule-3', { urls: ['url-31', 'url-32', 'url-33'], nodeId: 'node-31' }),
            getAccumulatedResult('rule-3', { urls: ['url-31', 'url-32'], nodeId: 'node-32' }),
            getAccumulatedResult('rule-3', { urls: ['url-31'], nodeId: 'node-33' }),
        );
        const passes = addAxeResult(
            new AxeResults(),
            getAccumulatedResult('rule-21', { urls: ['url-21'], nodeId: 'node-21' }),
            getAccumulatedResult('rule-22', { urls: ['url-22'], nodeId: 'node-22' }),
        );
        const incomplete = addAxeResult(
            new AxeResults(),
            getAccumulatedResult('rule-31', { urls: ['url-31'], nodeId: 'node-31' }),
            getAccumulatedResult('rule-32', { urls: ['url-32'], nodeId: 'node-32' }),
        );
        const inapplicable = addAxeResult(
            new AxeResults(),
            getAccumulatedResult('rule-41', { urls: ['url-41'] }),
            getAccumulatedResult('rule-42', { urls: ['url-42'] }),
        );
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
