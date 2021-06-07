// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CombinedReportDataConverter } from './combined-report-data-converter';
import { AxeResult, AxeNodeResult, AxeCoreResults, AxeResultsList } from './axe-result-types';
import { ScanResultData } from './scan-result-data';

let combinedReportDataConverter: CombinedReportDataConverter;

const scanResultData = {
    baseUrl: 'baseUrl',
    basePageTitle: 'basePageTitle',
    scanEngineName: 'scanEngineName',
    axeCoreVersion: 'axeCoreVersion',
    browserUserAgent: 'browserUserAgent',
    browserResolution: '1920x1080',
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
        id: ruleId,
        tags: [`tag-${ruleId}`],
        description: `description-${ruleId}`,
        helpUrl: `helpUrl-${ruleId}`,
        urls: data.urls,
        nodes: [],
        junctionNode: data.nodeId ? getAccumulatedNode(data.nodeId) : undefined,
        fingerprint: data.nodeId ? `id-${ruleId}|snippet-${data.nodeId}|selector-${data.nodeId}` : `id-${ruleId}`,
    } as AxeResult;
};

const addAxeResult = (axeResults: AxeResultsList, ...axeResultList: AxeResult[]): AxeResultsList => {
    axeResultList.forEach((axeResult) => axeResults.add(axeResult.fingerprint, axeResult));

    return axeResults;
};

describe(CombinedReportDataConverter, () => {
    beforeEach(() => {
        combinedReportDataConverter = new CombinedReportDataConverter();
    });

    it('convert axe results to combined report data', () => {
        const violations = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult('rule-1', { urls: ['url-11'], nodeId: 'node-11' }),
            getAccumulatedResult('rule-2', { urls: ['url-21', 'url-22'], nodeId: 'node-12' }),
            getAccumulatedResult('rule-2', { urls: ['url-21'], nodeId: 'node-22' }),
            getAccumulatedResult('rule-3', { urls: ['url-31', 'url-32', 'url-33'], nodeId: 'node-31' }),
            getAccumulatedResult('rule-3', { urls: ['url-31', 'url-32'], nodeId: 'node-32' }),
            getAccumulatedResult('rule-3', { urls: ['url-31'], nodeId: 'node-33' }),
        );
        const passes = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult('rule-21', { urls: ['url-21'], nodeId: 'node-21' }),
            getAccumulatedResult('rule-22', { urls: ['url-22'], nodeId: 'node-22' }),
        );
        const incomplete = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult('rule-31', { urls: ['url-31'], nodeId: 'node-31' }),
            getAccumulatedResult('rule-32', { urls: ['url-32'], nodeId: 'node-32' }),
        );
        const inapplicable = addAxeResult(
            new AxeResultsList(),
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

    it('Does not repeat failed rules in passed or not applicable sections', () => {
        const failedRuleId = 'failed-rule';
        const violations = addAxeResult(new AxeResultsList(), getAccumulatedResult(failedRuleId, { urls: ['url-11'], nodeId: 'node-11' }));
        const passes = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult(failedRuleId, { urls: ['url-21'], nodeId: 'node-21' }),
            getAccumulatedResult('passed-rule', { urls: ['url-22'], nodeId: 'node-22' }),
        );
        const inapplicable = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult(failedRuleId, { urls: ['url-31'], nodeId: 'node-31' }),
            getAccumulatedResult('not-applicable-rule', { urls: ['url-32'], nodeId: 'node-32' }),
        );

        const axeCoreResults = {
            violations,
            passes,
            incomplete: new AxeResultsList(),
            inapplicable,
        } as AxeCoreResults;

        const combinedReportData = combinedReportDataConverter.convert(axeCoreResults, scanResultData);
        const resultsByRule = combinedReportData.results.resultsByRule;

        expect(resultsByRule.failed.length).toBe(1);
        expect(resultsByRule.failed[0].failed[0].rule.ruleId).toBe(failedRuleId);

        expect(resultsByRule.passed.length).toBe(1);
        expect(resultsByRule.passed[0].ruleId).not.toBe(failedRuleId);

        expect(resultsByRule.notApplicable.length).toBe(1);
        expect(resultsByRule.notApplicable[0].ruleId).not.toBe(failedRuleId);
    });

    it('Does not repeat passed rule in not applicable section', () => {
        const passedRuleId = 'passed-rule';
        const passes = addAxeResult(new AxeResultsList(), getAccumulatedResult(passedRuleId, { urls: ['url-21'], nodeId: 'node-21' }));
        const inapplicable = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult(passedRuleId, { urls: ['url-31'], nodeId: 'node-31' }),
            getAccumulatedResult('not-applicable-rule', { urls: ['url-32'], nodeId: 'node-32' }),
        );

        const axeCoreResults = {
            violations: new AxeResultsList(),
            passes,
            incomplete: new AxeResultsList(),
            inapplicable,
        } as AxeCoreResults;

        const combinedReportData = combinedReportDataConverter.convert(axeCoreResults, scanResultData);
        const resultsByRule = combinedReportData.results.resultsByRule;

        expect(resultsByRule.passed.length).toBe(1);
        expect(resultsByRule.passed[0].ruleId).toBe(passedRuleId);

        expect(resultsByRule.notApplicable.length).toBe(1);
        expect(resultsByRule.notApplicable[0].ruleId).not.toBe(passedRuleId);
    });

    it('sorts failure cards by url count, then alphabetically by url', () => {
        const ruleId = 'rule-id';
        const violations = addAxeResult(
            new AxeResultsList(),
            // failure cards should be sorted in the reverse of this order
            getAccumulatedResult(ruleId, { urls: ['url-a'], nodeId: 'node-4' }),
            getAccumulatedResult(ruleId, { urls: ['url-c', 'url-d'], nodeId: 'node-3' }),
            getAccumulatedResult(ruleId, { urls: ['url-b', 'url-d'], nodeId: 'node-2' }),
            getAccumulatedResult(ruleId, { urls: ['url-z', 'url-y', 'url-x'], nodeId: 'node-1' }),
        );
        const axeCoreResults = {
            violations,
            passes: new AxeResultsList(),
            inapplicable: new AxeResultsList(),
            incomplete: new AxeResultsList(),
        } as AxeCoreResults;

        const combinedReportData = combinedReportDataConverter.convert(axeCoreResults, scanResultData);

        expect(combinedReportData).toMatchSnapshot();
    });

    it('sorts failed rules by number of failure instances', () => {
        const ruleId1 = 'rule-id-1';
        const ruleId2 = 'rule-id-2';
        const violations = addAxeResult(
            new AxeResultsList(),
            getAccumulatedResult(ruleId1, { urls: ['url-1', 'url-2', 'url-3'], nodeId: 'node-1' }),
            getAccumulatedResult(ruleId1, { urls: ['url-4'], nodeId: 'node-2' }),
            getAccumulatedResult(ruleId2, { urls: ['url-5'], nodeId: 'node-3' }),
        );
        const axeCoreResults = {
            violations,
            passes: new AxeResultsList(),
            inapplicable: new AxeResultsList(),
            incomplete: new AxeResultsList(),
        } as AxeCoreResults;

        const combinedReportData = combinedReportDataConverter.convert(axeCoreResults, scanResultData);
        const failedRules = combinedReportData.results.resultsByRule.failed;

        expect(failedRules.length).toBe(2);
        expect(failedRules[0].failed[0].rule.ruleId).toBe(ruleId1);
        expect(failedRules[1].failed[0].rule.ruleId).toBe(ruleId2);
    });
});
