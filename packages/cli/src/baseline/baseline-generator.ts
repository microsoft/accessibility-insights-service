// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResult, AxeResultsList } from 'axe-result-converter';
import { injectable } from 'inversify';
import { identity, sortBy } from 'lodash';
import { BaselineFileContent, BaselineResult, UrlNormalizer } from './baseline-types';

@injectable()
export class BaselineGenerator {
    public generateBaseline(axeResultsList: AxeResultsList, urlNormalizer?: UrlNormalizer): BaselineFileContent {
        const combinedViolations = axeResultsList.values();
        const unsortedBaselineResults = combinedViolations.map(result => this.combinedViolationToBaselineResult(result, urlNormalizer));
        const sortedBaselineResults = this.sortBaselineResults(unsortedBaselineResults);

        const baselineContent: BaselineFileContent = {
            metadata: { fileFormatVersion: '1' },
            results: sortedBaselineResults,
        };

        return baselineContent;
    }

    private combinedViolationToBaselineResult(result: AxeResult, urlNormalizer?: UrlNormalizer): BaselineResult {
        const node = result.junctionNode;
        if (node == null) {
            throw new Error('Invalid input result; does not contain a junctionNode');
        }

        const cssSelector = node.selectors.find(s => s.type === 'css')?.selector;
        const xpathSelector = node.selectors.find(s => s.type === 'xpath')?.selector;
        const urls = result.urls.map(urlNormalizer ?? identity).sort();

        if (cssSelector == null) {
            throw new Error('Invalid input result; does not contain a css selector');
        }

        // The order in which properties are specified is important because it will be
        // reflected in generated baseline files. Changing the order is a breaking change.
        return {
            cssSelector,
            htmlSnippet: node.html,
            rule: result.id,
            urls,
            xpathSelector,
        };
    }

    private sortBaselineResults(results: BaselineResult[]): BaselineResult[] {
        return sortBy(results, ['rule', 'cssSelector', 'xpathSelector', 'htmlSnippet']);
    }
}
