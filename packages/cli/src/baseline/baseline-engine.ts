// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isDeepStrictEqual } from 'util';
import { AxeCoreResults } from 'axe-result-converter';
import { inject, injectable } from 'inversify';
import { BaselineEvaluation, BaselineOptions, BaselineResult } from './baseline-types';
import { BaselineGenerator } from './baseline-generator';

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
        const newBaseline = this.baselineGenerator.generateBaseline(axeResults.violations, baselineOptions.urlNormalizer);
        const newBaselineResults: BaselineResult[] = newBaseline.results;

        if (isDeepStrictEqual(oldBaselineResults, newBaselineResults)) {
            return {
                suggestedBaselineUpdate: null,
                fixedViolationsByRule: {},
                newViolationsByRule: {},
                totalFixedViolations: 0,
                totalNewViolations: 0,
            };
        }

        throw new Error('TODO: There is a difference between the baseline and the new results, but BaselineEngine is not implemented yet');
    }
}
