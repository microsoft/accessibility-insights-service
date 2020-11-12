// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable, inject } from 'inversify';
import axe from 'axe-core';
import { HashGenerator } from 'common';
import { Selector, AxeResult, AxeCoreResults } from './axe-result-types';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class AxeResultsReducer {
    constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public reduce(accumulatedAxeResults: AxeCoreResults, currentAxeResults: axe.AxeResults): void {
        this.setUrl(accumulatedAxeResults, currentAxeResults);
        this.reduceResults(currentAxeResults.url, accumulatedAxeResults.violations, currentAxeResults.violations);
        this.reduceResults(currentAxeResults.url, accumulatedAxeResults.passes, currentAxeResults.passes);
        this.reduceResults(currentAxeResults.url, accumulatedAxeResults.incomplete, currentAxeResults.incomplete);
        this.reduceResultsWithoutNodes(currentAxeResults.url, accumulatedAxeResults.inapplicable, currentAxeResults.inapplicable);
    }

    private reduceResults(url: string, accumulatedResults: AxeResult[], currentResults: axe.Result[]): void {
        if (currentResults) {
            for (const currentResult of currentResults) {
                if (currentResult) {
                    for (const node of currentResult.nodes) {
                        if (node) {
                            const selectors = this.getElementSelectors(node);
                            const fingerprint = this.getElementFingerprint(currentResult, node, selectors);
                            const resultWithMatchingNode = this.getResultForNode(accumulatedResults, fingerprint);
                            if (resultWithMatchingNode !== undefined) {
                                if (!resultWithMatchingNode.urls.some((u) => u === url)) {
                                    resultWithMatchingNode.urls.push(url);
                                }
                            } else {
                                accumulatedResults.push({
                                    ...currentResult,
                                    urls: [url],
                                    nodes: [
                                        {
                                            ...node,
                                            selectors,
                                            fingerprint,
                                        },
                                    ],
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    private reduceResultsWithoutNodes(url: string, accumulatedResults: AxeResult[], currentResults: axe.Result[]): void {
        if (currentResults) {
            for (const currentResult of currentResults) {
                if (currentResult) {
                    const matchingResult = accumulatedResults.find((result) => result.id === currentResult.id);
                    if (matchingResult !== undefined) {
                        if (!matchingResult.urls.some((u) => u === url)) {
                            matchingResult.urls.push(url);
                        }
                    } else {
                        accumulatedResults.push({
                            ...currentResult,
                            urls: [url],
                            nodes: [],
                        });
                    }
                }
            }
        }
    }

    private getResultForNode(results: AxeResult[], fingerprint: string): AxeResult {
        for (const result of results) {
            if (result) {
                if (result.nodes?.some((node) => node.fingerprint === fingerprint)) {
                    return result;
                }
            }
        }

        return undefined;
    }

    private getElementFingerprint(result: axe.Result, node: axe.NodeResult, selectors: Selector[]): string {
        return this.hashGenerator.generateBase64Hash(result.id, node.html, ...selectors.map((s) => s.selector));
    }

    private getElementSelectors(node: axe.NodeResult): Selector[] {
        const selectors: Selector[] = [{ selector: node.target.join(';'), type: 'css' }];
        if ((node as any).xpath) {
            const xpath = (node as any).xpath.join(';');
            selectors.push({ selector: xpath, type: 'xpath' });
        }

        return selectors;
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
