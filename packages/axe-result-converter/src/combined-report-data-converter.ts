// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
    CombinedReportParameters,
    AxeRuleData,
    FailureData,
    HowToFixData,
    FormattedCheckResult,
    FailuresGroup,
} from 'accessibility-insights-report';
import axe from 'axe-core';
import _ from 'lodash';
import { injectable } from 'inversify';
import { HashSet } from 'common';
import { ScanResultData } from './scan-result-data';
import { AxeNodeResult, AxeCoreResults, AxeResults } from './axe-result-types';

type SortableFailuresGroup = {
    failuresGroup: FailuresGroup;
    instancesCount: number;
};

@injectable()
export class CombinedReportDataConverter {
    public convert(axeResults: AxeCoreResults, scanResultData: ScanResultData): CombinedReportParameters {
        const handledRuleIds = new HashSet<string>();

        const failed = this.getFailureData(axeResults.violations);
        this.addRuleIdsFromFailures(handledRuleIds, failed);

        const passed = this.getAxeRuleData(axeResults.passes, handledRuleIds);
        this.addRuleIdsFromRuleData(handledRuleIds, passed);

        const inapplicable = this.getAxeRuleData(axeResults.inapplicable, handledRuleIds);

        const failedByRule = this.groupFailureDataByRule(failed);
        const resultCounts = {
            failedUrls: scanResultData.urlCount.failed,
            passedUrls: scanResultData.urlCount.passed,
            unscannableUrls: scanResultData.urlCount.total - (scanResultData.urlCount.failed + scanResultData.urlCount.passed),
        };

        return {
            serviceName: scanResultData.scanEngineName,
            axeVersion: scanResultData.axeCoreVersion,
            userAgent: scanResultData.browserUserAgent,
            scanDetails: {
                baseUrl: scanResultData.baseUrl,
                basePageTitle: scanResultData.basePageTitle,
                scanStart: scanResultData.scanStarted,
                scanComplete: scanResultData.scanEnded,
                durationSeconds: (scanResultData.scanEnded.valueOf() - scanResultData.scanStarted.valueOf()) / 1000,
            },
            results: {
                urlResults: resultCounts,
                resultsByRule: {
                    failed: failedByRule,
                    passed: passed,
                    notApplicable: inapplicable,
                },
            },
        };
    }

    private groupFailureDataByRule(failureData: FailureData[]): FailuresGroup[] {
        const failuresGroup: FailuresGroup[] = [];
        if (failureData) {
            const failuresByRule = _.groupBy(failureData, (failure) => failure.rule.ruleId.toLowerCase());
            Object.keys(failuresByRule).map((rule) => {
                failuresGroup.push({
                    key: rule,
                    failed: failuresByRule[rule].sort(this.compareFailureData),
                });
            });
        }

        return this.sortFailuresGroups(failuresGroup);
    }

    private getFailureData(results: AxeResults): FailureData[] {
        const failureData: FailureData[] = [];
        if (!results) {
            return failureData;
        }

        for (const result of results) {
            if (result) {
                failureData.push({
                    urls: result.urls,
                    elementSelector: this.getElementSelector(result.junctionNode),
                    snippet: result.junctionNode.html,
                    fix: this.getNodeResult(result.junctionNode),
                    rule: this.getAxeRuleDataForResult(result),
                });
            }
        }

        return failureData;
    }

    private getAxeRuleData(results: AxeResults, excludeRuleIds: HashSet<string>): AxeRuleData[] {
        const axeRuleData = new HashSet<AxeRuleData>();
        if (results) {
            for (const result of results) {
                if (result) {
                    if (!axeRuleData.has(result.id) && !excludeRuleIds.has(result.id)) {
                        axeRuleData.add(result.id, this.getAxeRuleDataForResult(result));
                    }
                }
            }
        }

        return axeRuleData.values().sort(this.compareAxeRuleData);
    }

    private getNodeResult(node: axe.NodeResult): HowToFixData {
        if (node) {
            return {
                any: this.getNodeCheckResults(node.any),
                all: this.getNodeCheckResults(node.all),
                none: this.getNodeCheckResults(node.none),
                failureSummary: node.failureSummary,
            };
        }

        return undefined;
    }

    private getNodeCheckResults(nodeCheckResults: axe.CheckResult[]): FormattedCheckResult[] {
        const checkResults: FormattedCheckResult[] = [];
        if (nodeCheckResults) {
            for (const nodeCheckResult of nodeCheckResults) {
                checkResults.push({
                    id: nodeCheckResult?.id,
                    message: nodeCheckResult?.message,
                    data: nodeCheckResult?.data,
                });
            }
        }

        return checkResults;
    }

    private getAxeRuleDataForResult(result: axe.Result): AxeRuleData {
        if (result) {
            return {
                ruleId: result.id,
                tags: result.tags,
                description: result.description,
                ruleUrl: result.helpUrl,
            };
        }

        return undefined;
    }

    private getElementSelector(node: AxeNodeResult): string {
        if (node && node.selectors) {
            const css = node.selectors.find((selector) => selector.type === 'css');
            if (css) {
                return css.selector;
            } else {
                return node.selectors.find((selector) => selector.type === 'xpath')?.selector;
            }
        }

        return undefined;
    }

    private sortFailuresGroups(failuresGroups: FailuresGroup[]): FailuresGroup[] {
        let sortableFailuresGroups: SortableFailuresGroup[] = failuresGroups.map((failuresGroup) => {
            let instancesCount = 0;
            if (failuresGroup.failed) {
                failuresGroup.failed.forEach((failureData) => {
                    instancesCount += failureData.urls.length;
                });
            }

            return { failuresGroup, instancesCount };
        });

        sortableFailuresGroups = sortableFailuresGroups.sort(this.compareFailureGroup);

        return sortableFailuresGroups.map((sortable) => sortable.failuresGroup);
    }

    private compareFailureGroup(group1: SortableFailuresGroup, group2: SortableFailuresGroup): number {
        if (group1.instancesCount < group2.instancesCount) {
            return 1;
        }

        if (group1.instancesCount > group2.instancesCount) {
            return -1;
        }

        return 0;
    }

    private compareFailureData(data1: FailureData, data2: FailureData): number {
        if (data1.urls.length !== data2.urls.length) {
            return data2.urls.length - data1.urls.length;
        }

        if (data1.urls[0] > data2.urls[0]) {
            return 1;
        }

        if (data1.urls[0] < data2.urls[0]) {
            return -1;
        }

        return 0;
    }

    private compareAxeRuleData(data1: AxeRuleData, data2: AxeRuleData): number {
        if (data1.ruleId > data2.ruleId) {
            return 1;
        }

        if (data1.ruleId < data2.ruleId) {
            return -1;
        }

        return 0;
    }

    private addRuleIdsFromFailures(ruleIds: HashSet<string>, failureData: FailureData[]): void {
        failureData.forEach((failure) => {
            const ruleId = failure.rule.ruleId;
            ruleIds.add(ruleId, ruleId);
        });
    }

    private addRuleIdsFromRuleData(ruleIds: HashSet<string>, passedRuleData: AxeRuleData[]): void {
        passedRuleData.forEach((passedRule) => {
            ruleIds.add(passedRule.ruleId, passedRule.ruleId);
        });
    }
}
