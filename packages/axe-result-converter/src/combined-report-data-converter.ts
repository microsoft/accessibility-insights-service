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
import { ScanResultData } from './scan-result-data';
import { AxeResult, AxeNodeResult, AxeCoreResults } from './axe-result-types';

interface FailureReportData {
    urlsCount: number;
    failureData: FailureData[];
}

export class CombinedReportDataConverter {
    public convert(axeResults: AxeCoreResults, scanResultData: ScanResultData): CombinedReportParameters {
        const failed = this.getFailureData(axeResults.violations);
        const failedByRule = this.groupFailureDataByRule(failed.failureData);
        const passed = this.getAxeRuleData(axeResults.passes);
        const inapplicable = this.getAxeRuleData(axeResults.inapplicable);
        const resultCounts = {
            failedUrls: failed.urlsCount,
            passedUrls: passed.length,
            unscannableUrls: inapplicable.length,
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
                    failed: failuresByRule[rule],
                });
            });
        }

        return failuresGroup.sort(this.compareFailureGroup);
    }

    private getFailureData(results: AxeResult[]): FailureReportData {
        let urlsCount = 0;
        const failureData: FailureData[] = [];
        if (results) {
            for (const result of results) {
                if (result) {
                    for (const node of result.nodes) {
                        if (node) {
                            if (result.urls) {
                                urlsCount = urlsCount + result.urls.length;
                            }

                            failureData.push({
                                urls: result.urls,
                                elementSelector: this.getElementSelector(node),
                                snippet: node.html,
                                fix: this.getNodeResult(node),
                                rule: this.getAxeRuleDataForResult(result),
                            });
                        }
                    }
                }
            }
        }

        return {
            urlsCount,
            failureData,
        };
    }

    private getAxeRuleData(results: axe.Result[]): AxeRuleData[] {
        const axeRuleData: AxeRuleData[] = [];
        if (results) {
            for (const result of results) {
                const data = this.getAxeRuleDataForResult(result);
                if (data) {
                    axeRuleData.push(data);
                }
            }
        }

        return axeRuleData;
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

    private compareFailureGroup(group1: FailuresGroup, group2: FailuresGroup): number {
        if (group1.failed?.length < group2.failed?.length) {
            return 1;
        }

        if (group1.failed?.length > group2.failed?.length) {
            return -1;
        }

        return 0;
    }
}
