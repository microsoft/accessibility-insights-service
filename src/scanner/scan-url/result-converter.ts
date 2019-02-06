import { AxeResults, NodeResult, Result } from 'axe-core';
import { Hash } from 'crypto';
import { ResultLevel, ScanResult } from './scan-result';

export class ResultConverter {
    public constructor(private readonly sha256: Hash) {}

    public convert(axeResults: AxeResults): ScanResult[] {
        const results: ScanResult[] = [];

        axeResults.violations.forEach((axeResult: Result) => {
            results.push(...this.convertResults(axeResult, axeResult.nodes, ResultLevel.error, axeResults.url, axeResults.timestamp));
        });

        return results;
    }

    private generateScanResultId(
        url: string,
        fullyQualifiedLogicalName: string,
        snippet: string,
        ruleId: string,
        fingerprints: {},
    ): string {
        const properties: string[] = [url, fullyQualifiedLogicalName, snippet, ruleId];
        Object.keys(fingerprints).forEach((key: keyof object) => properties.push(`${key}:${fingerprints[key]}`));
        const hashSeed: string = properties.join('|').toLowerCase();

        return this.sha256.update(hashSeed).digest('hex');
    }

    private convertResults(axeResult: Result, nodes: NodeResult[], level: ResultLevel, url: string, timestamp: string): ScanResult[] {
        return nodes.map((node: NodeResult) => {
            const selector = node.target.join(';');

            const scanResult: ScanResult = {
                id: '',
                result: {
                    ruleId: axeResult.id,
                    level: level,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: url,
                                },
                                region: {
                                    snippet: {
                                        text: node.html,
                                    },
                                },
                            },
                            fullyQualifiedLogicalName: selector,
                        },
                    ],
                    fingerprints: {},
                },
            };
            scanResult.id = this.generateScanResultId(url, selector, node.html, axeResult.id, scanResult.result.fingerprints);

            return scanResult;
        });
    }
}
