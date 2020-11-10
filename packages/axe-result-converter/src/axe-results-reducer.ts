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
        this.reduceResults(accumulatedAxeResults.violations, currentAxeResults.violations);
        this.reduceResults(accumulatedAxeResults.passes, currentAxeResults.passes);
        this.reduceResults(accumulatedAxeResults.incomplete, currentAxeResults.incomplete);
        this.reduceResultsWithoutNodes(accumulatedAxeResults.inapplicable, currentAxeResults.inapplicable);
    }

    public reduceResults(accumulatedResults: AxeResult[], currentResults: axe.Result[]): void {
        if (currentResults) {
            for (const currentResult of currentResults) {
                for (const node of currentResult.nodes) {
                    const selectors = this.getElementSelectors(node);
                    const fingerprint = this.getElementFingerprint(node, selectors);
                    if (this.containsNode(accumulatedResults, fingerprint) === false) {
                        accumulatedResults.push({
                            ...currentResult,
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

    private reduceResultsWithoutNodes(accumulatedResults: axe.Result[], currentResults: axe.Result[]): void {
        if (currentResults) {
            for (const currentResult of currentResults) {
                if (accumulatedResults.some((result) => result.id === currentResult.id) === false) {
                    accumulatedResults.push({
                        ...currentResult,
                    });
                }
            }
        }
    }

    private containsNode(results: AxeResult[], fingerprint: string): boolean {
        for (const result of results) {
            if (result.nodes.some((node) => node.fingerprint === fingerprint)) {
                return true;
            }
        }

        return false;
    }

    private getElementFingerprint(node: axe.NodeResult, selectors: Selector[]): string {
        return this.hashGenerator.generateBase64Hash(node.html, ...selectors.map((s) => s.selector));
    }

    private getElementSelectors(node: axe.NodeResult): Selector[] {
        const selectors: Selector[] = [{ selector: node.target.join(';'), type: 'css' }];
        if ((node as any).xpath) {
            const xpath = (node as any).xpath.join(';');
            selectors.push({ selector: xpath, type: 'xpath' });
        }

        return selectors;
    }
}
