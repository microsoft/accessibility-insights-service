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
        const unsortedBaselineResults = combinedViolations.map((result) => this.combinedViolationToBaselineResult(result, urlNormalizer));
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

        const cssSelector = node.selectors.find((s) => s.type === 'css')?.selector;
        const xpathSelector = node.selectors.find((s) => s.type === 'xpath')?.selector;
        const urls = result.urls.map(urlNormalizer ?? identity).sort();

        if (cssSelector == null) {
            throw new Error('Invalid input result; does not contain a css selector');
        }

        // The order in which properties are added to the result matters; it affects the serialized baseline file,
        // which must be byte-for-byte consistent over time.
        const baselineResult: BaselineResult = {
            cssSelector,
            htmlSnippet: node.html,
            rule: result.id,
            urls,
        };

        // It's important to do this rather than just allowing "xpathSelector: undefined" in the output object.
        // This is because, again, to ensure that we serialize consistently.
        if (xpathSelector != null) {
            baselineResult.xpathSelector = xpathSelector;
        }

        return baselineResult;
    }

    private sortBaselineResults(results: BaselineResult[]): BaselineResult[] {
        return sortBy(results, ['rule', 'cssSelector', 'xpathSelector', 'htmlSnippet']);
    }
}
