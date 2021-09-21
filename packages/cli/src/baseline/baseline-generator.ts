// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResult } from 'axe-result-converter';
import { inject, injectable } from 'inversify';
import JSON5 from 'json5';
import { sortBy } from 'lodash';
import format from 'pretty-format';
import { CombinedScanResult } from '../crawler/ai-crawler';
import { BaselineFormat, BaselineResult } from './baseline-format';
import { BaselineSchemaValidator } from './baseline-schema';

@injectable()
export class BaselineGenerator {
    private readonly combinedViolationToBaselineResult = (result: AxeResult): BaselineResult => {
        // The order in which properties are specified is important because it will be
        // reflected in generated baseline files. Changing the order is a breaking change.
        return {
            cssSelector: result.junctionNode.selectors[0].selector,
            htmlSnippet: result.junctionNode.html,
            rule: result.id,
            urls: [...result.urls].sort(),
            xpathSelector: result.junctionNode.selectors[1]?.selector,
        };
    };

    private readonly sortBaselineResults = (results: BaselineResult[]): BaselineResult[] => {
        return sortBy(results, ['rule', 'cssSelector', 'xpathSelector', 'htmlSnippet']);
    };

    public constructor(
        @inject(BaselineSchemaValidator) private readonly baselineSchemaValidator: BaselineSchemaValidator,
    ) {}

    public generateBaseline(combinedScanResult: CombinedScanResult): BaselineFormat {
        const combinedViolations = combinedScanResult.combinedAxeResults.violations.values();
        const unsortedBaselineResults = combinedViolations.map(this.combinedViolationToBaselineResult);
        const sortedBaselineResults = this.sortBaselineResults(unsortedBaselineResults);

        const baselineContent: BaselineFormat = {
            metadata: { fileFormatVersion: '1' },
            results: sortedBaselineResults,
        };

        return baselineContent;
    }

    public formatBaseline(baselineContent: BaselineFormat): string {
        const formatOptions = {
            indent: 2,
            printBasicPrototype: false,
        };

        return format(baselineContent, formatOptions);
    }

    public parseBaseline(rawBaselineContent: string): BaselineFormat {
        const unvalidatedData = JSON5.parse(rawBaselineContent);

        return this.baselineSchemaValidator.validate(unvalidatedData);
    }
}
