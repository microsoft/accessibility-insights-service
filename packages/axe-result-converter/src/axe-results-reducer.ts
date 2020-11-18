// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable, inject } from 'inversify';
import axe from 'axe-core';
import { HashGenerator } from 'common';
import { Selector, AxeCoreResults, AxeResults, AxeResult } from './axe-result-types';

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

    private reduceResults(url: string, accumulatedResults: AxeResults, currentResults: axe.Result[]): void {
        if (currentResults) {
            for (const currentResult of currentResults) {
                if (currentResult) {
                    for (const node of currentResult.nodes) {
                        if (node) {
                            const selectors = this.getElementSelectors(node);
                            const fingerprint = this.getElementFingerprint(currentResult, node, selectors);
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
                                        selectors,
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

    private reduceResultsWithoutNodes(url: string, accumulatedResults: AxeResults, currentResults: axe.Result[]): void {
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
