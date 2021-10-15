// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeCoreResults } from 'axe-result-converter';
import { inject, injectable } from 'inversify';
import { BaselineEvaluation, BaselineOptions, BaselineResult, CountsByRule } from './baseline-types';
import { BaselineGenerator } from './baseline-generator';

interface UrlComparison {
    fixedCount: number;
    intersectingCount: number;
    newUrls: Set<string>;
}

@injectable()
export class BaselineEngine {
    constructor(@inject(BaselineGenerator) private readonly baselineGenerator: BaselineGenerator) {}

    public updateResultsInPlace(axeResults: AxeCoreResults, baselineOptions: BaselineOptions): BaselineEvaluation {
        const oldBaselineResults: BaselineResult[] = baselineOptions.baselineContent?.results ?? [];
        const newBaseline = this.baselineGenerator.generateBaseline(axeResults.violations, baselineOptions.urlNormalizer);
        const newBaselineResults: BaselineResult[] = newBaseline.results;

        // Take advantage of the fact that baseline results are always sorted
        let oldResultIndex = 0;
        let newResultIndex = 0;

        const evaluation: BaselineEvaluation = {
            suggestedBaselineUpdate: null,
            fixedViolationsByRule: {},
            newViolationsByRule: {},
            totalFixedViolations: 0,
            totalNewViolations: 0,
        };

        while (oldResultIndex < oldBaselineResults.length || newResultIndex < newBaselineResults.length) {
            const oldBaselineResult = oldResultIndex < oldBaselineResults.length ? oldBaselineResults[oldResultIndex] : null;
            const newBaselineResult = newResultIndex < newBaselineResults.length ? newBaselineResults[newResultIndex] : null;

            const resultDetailComparison = this.compareResultDetails(oldBaselineResult, newBaselineResult);

            if (resultDetailComparison < 0) { // exists in oldBaselineResults but not newBaselineResults
                this.addFixedViolationsToEvaluation(oldBaselineResult, evaluation);
                oldResultIndex++;
            } else if (resultDetailComparison > 0) { // exists in newBaselineResults but not oldBaselineResults
                this.addNewViolationsToEvaluation(newBaselineResult, evaluation);
                newResultIndex++;
            } else { // exists in both oldBaselineResults and newBaselineResults, check urls
                const urlComparison: UrlComparison = this.getUrlComparison(oldBaselineResult.urls, newBaselineResult.urls);
                if (urlComparison.fixedCount) {
                    this.updateCountsByRule(evaluation.fixedViolationsByRule, oldBaselineResult.rule, urlComparison.fixedCount);
                    evaluation.totalFixedViolations += urlComparison.fixedCount;
                }
                if (urlComparison.newUrls.size) {
                    this.updateCountsByRule(evaluation.newViolationsByRule, oldBaselineResult.rule, urlComparison.newUrls.size);
                    evaluation.totalNewViolations += urlComparison.newUrls.size;
                }

                // TODO: Update URL's in axeResults

                oldResultIndex++;
                newResultIndex++;
            }
        }

        if (evaluation.totalFixedViolations || evaluation.totalNewViolations) {
            evaluation.suggestedBaselineUpdate = newBaseline;
        }

        return evaluation;
    }

    private addFixedViolationsToEvaluation(fixedViolation: BaselineResult, evaluation: BaselineEvaluation): void {
        this.updateCountsByRule(evaluation.fixedViolationsByRule, fixedViolation.rule, fixedViolation.urls.length);
        evaluation.totalFixedViolations += fixedViolation.urls.length;
    }

    private addNewViolationsToEvaluation(newViolation: BaselineResult, evaluation: BaselineEvaluation): void {
        this.updateCountsByRule(evaluation.newViolationsByRule, newViolation.rule, newViolation.urls.length);
        evaluation.totalNewViolations += newViolation.urls.length;
    }

    private compareResultDetails(oldResult: BaselineResult | null, newResult: BaselineResult | null): number {
        if (oldResult && newResult) {
            // Compare the results in the order that they're sorted (rule, cssSelector, xPathSelector, htmlSnippet))
            return this.safelyCompareStrings(oldResult.rule, newResult.rule) ||
                this.safelyCompareStrings(oldResult.cssSelector, newResult.cssSelector) ||
                this.safelyCompareStrings(oldResult.xpathSelector, newResult.xpathSelector) ||
                this.safelyCompareStrings(oldResult.htmlSnippet, newResult.htmlSnippet);
        }

        return oldResult ? 1 : -1;
    }

    private safelyCompareStrings(oldString: string | undefined, newString: string | undefined) : number {
        if (oldString && newString) {
            return oldString.localeCompare(oldString, newString);
        }

        return oldString ? 1 : -1;
    }

    private updateCountsByRule(countsByRule: CountsByRule, rule: string, count: number): void {
        const oldCount = countsByRule[rule] || 0;

        countsByRule[rule] = oldCount + count;
    }

    private getUrlComparison(oldUrls: string[], newUrls: string[]): UrlComparison {
        const urlComparison: UrlComparison = {
            fixedCount: 0,
            intersectingCount: 0,
            newUrls: new Set(),
        };

        const oldSet: Set<string> = new Set(oldUrls);

        newUrls.map((url) => {
            if (oldSet.has(url)) {
                urlComparison.intersectingCount++;
            } else {
                urlComparison.newUrls.add(url);
            }
        });

        urlComparison.fixedCount = oldSet.size - urlComparison.intersectingCount;

        return urlComparison;
    }
}
