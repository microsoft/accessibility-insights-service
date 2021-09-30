// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeCoreResults } from 'axe-result-converter';
import { inject, injectable } from 'inversify';
import { BaselineFileContent, BaselineResult } from './baseline-format';
import { BaselineGenerator } from './baseline-generator';

export type BaselineOptions = {
    baselineContent: BaselineFileContent | null;
    urlNormalizationPatterns: string[]; // regular expressions
};

export type CountsByRule = { [ruleId in string]: number };

export type BaselineEvaluation = {
    suggestedBaselineUpdate: null | BaselineFileContent; // null implies "no update required"
    newViolationsByRule: CountsByRule;
    fixedViolationsByRule: CountsByRule;
    totalNewViolations: number;
    totalFixedViolations: number;
};

@injectable()
export class BaselineEngine {
    constructor(
        @inject(BaselineGenerator) private readonly baselineGenerator: BaselineGenerator,
    ) {}

    // Should do 2 things (they're combined because the processing will be similar):
    // * Update combinedAxeResults inline (either marking individual URLs as "new" vs "baselined" or by splitting out a new
    //   baselinedViolations grouping, depending what we decide to do for the report)
    // * Return a BaselineEvaluation where suggestedBaselineUpdate is either null (if no baseline update is required) or
    //   the suggested new baseline content (if a baseline update is required), and all the other "count" properties are
    //   filled in appropriately
    public updateResultsInPlace(axeResults: AxeCoreResults, baselineOptions: BaselineOptions): BaselineEvaluation {
        const oldBaselineResults: BaselineResult[] = baselineOptions.baselineContent?.results ?? [];
        const newBaseline = this.baselineGenerator.generateBaseline(axeResults.violations);
        const newBaselineResults: BaselineResult[] = newBaseline.results;

        throw new Error('TODO: Not implemented yet');
    }
}
