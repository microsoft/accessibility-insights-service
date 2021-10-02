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

    public updateResultsInPlace(axeResults: AxeCoreResults, baselineOptions: BaselineOptions): BaselineEvaluation {
        const oldBaselineResults: BaselineResult[] = baselineOptions.baselineContent?.results ?? [];
        const newBaseline = this.baselineGenerator.generateBaseline(axeResults.violations, baselineOptions.urlNormalizer);
        const newBaselineResults: BaselineResult[] = newBaseline.results;

        const suggestedBaselineUpdate = isDeepStrictEqual(oldBaselineResults, newBaselineResults) ? null : newBaseline;

        // TODO: update axeResults in-place, adding "new" vs "existing" annotations for each URL
        // TODO: calculate assorted total/by-rule counts

        return {
            suggestedBaselineUpdate,
            fixedViolationsByRule: {},
            newViolationsByRule: {},
            totalFixedViolations: -1,
            totalNewViolations: -1,
        };
    }
}
