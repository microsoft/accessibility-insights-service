// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import axe from 'axe-core';
import { HashGenerator } from 'common';
import { Selector, AxeCoreResults, AxeResultsList, AxeResult } from './axe-result-types';
import { FingerprintGenerator } from './fingerprint-generator';

/* eslint-disable @typescript-eslint/no-explicit-any */

type SelectorInfo = {
    css: string;
    xpath?: string;
    selectors: Selector[];
};

@injectable()
export class AxeResultsReducer {
    constructor(
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(FingerprintGenerator) private readonly fingerprintGenerator: FingerprintGenerator,
    ) {}

    public reduce(accumulatedAxeResults: AxeCoreResults, currentAxeResults: axe.AxeResults): void {
        this.setUrl(accumulatedAxeResults, currentAxeResults);
        this.reduceResults(currentAxeResults.url, accumulatedAxeResults.violations, currentAxeResults.violations);
        this.reduceResults(currentAxeResults.url, accumulatedAxeResults.passes, currentAxeResults.passes);
        this.reduceResults(currentAxeResults.url, accumulatedAxeResults.incomplete, currentAxeResults.incomplete);
        this.reduceResultsWithoutNodes(currentAxeResults.url, accumulatedAxeResults.inapplicable, currentAxeResults.inapplicable);
    }

    private reduceResults(url: string, accumulatedResults: AxeResultsList, currentResults: axe.Result[]): void {
        if (currentResults) {
            for (const currentResult of currentResults) {
                if (currentResult) {
                    for (const node of currentResult.nodes) {
                        if (node) {
                            const selectorInfo = this.getSelectorInfo(node);
                            const fingerprint = this.getElementFingerprint(currentResult, node, selectorInfo);
                            const matchingResult = accumulatedResults.get(fingerprint);
                            if (matchingResult !== undefined) {
                                if (!matchingResult.urls.some((u) => u === url)) {
                                    matchingResult.urls.push(url);
                                }
                            } else {
                                const result: AxeResult = {
                                    ...currentResult,
                                    nodes: [],
                                    urls: [url],
                                    junctionNode: {
                                        ...node,
                                        selectors: selectorInfo.selectors,
                                    },
                                    fingerprint,
                                };
                                accumulatedResults.add(fingerprint, result);
                            }
                        }
                    }
                }
            }
        }
    }

    private reduceResultsWithoutNodes(url: string, accumulatedResults: AxeResultsList, currentResults: axe.Result[]): void {
        if (currentResults) {
            for (const currentResult of currentResults) {
                if (currentResult) {
                    const fingerprint = this.hashGenerator.generateBase64Hash(currentResult.id);
                    const matchingResult = accumulatedResults.get(fingerprint);
                    if (matchingResult !== undefined) {
                        if (!matchingResult.urls.some((u) => u === url)) {
                            matchingResult.urls.push(url);
                        }
                    } else {
                        const result: AxeResult = {
                            ...currentResult,
                            nodes: [],
                            urls: [url],
                            fingerprint,
                        };
                        accumulatedResults.add(fingerprint, result);
                    }
                }
            }
        }
    }

    private getElementFingerprint(result: axe.Result, node: axe.NodeResult, selectorInfo: SelectorInfo): string {
        return this.fingerprintGenerator.getFingerprint({
            rule: result.id,
            snippet: node.html,
            cssSelector: selectorInfo.css,
            xpathSelector: selectorInfo.xpath,
        });
    }

    private getSelectorInfo(node: axe.NodeResult): SelectorInfo {
        const css = node.target.join(';');
        const selectors: Selector[] = [{ selector: css, type: 'css' }];

        let xpath;
        if ((node as any).xpath) {
            xpath = (node as any).xpath.join(';');
            selectors.push({ selector: xpath, type: 'xpath' });
        }

        return { css, xpath, selectors };
    }

    private setUrl(accumulatedAxeResults: AxeCoreResults, currentAxeResults: axe.AxeResults): void {
        if (accumulatedAxeResults.urls) {
            if (!accumulatedAxeResults.urls.some((url) => url === currentAxeResults.url)) {
                accumulatedAxeResults.urls.push(currentAxeResults.url);
            }
        } else {
            accumulatedAxeResults.urls = [currentAxeResults.url];
        }
    }
}
