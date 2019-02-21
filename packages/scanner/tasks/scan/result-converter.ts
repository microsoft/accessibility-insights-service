import { AxeResults, NodeResult, Result } from 'axe-core';
import { HashIdGenerator } from './hash-id-generator';
import { ScanConfig } from './run-task';
import { ResultLevel, ScanResult } from './scan-result';

export class ResultConverter {
    public constructor(private readonly hashIdGenerator: HashIdGenerator) {}

    public convert(axeResults: AxeResults, scanConfig: ScanConfig): ScanResult[] {
        const results: ScanResult[] = [];

        axeResults.violations.forEach((axeResult: Result) => {
            results.push(...this.convertResults(axeResult, axeResult.nodes, ResultLevel.error, scanConfig));
        });

        return results;
    }

    private convertResults(axeResult: Result, nodes: NodeResult[], level: ResultLevel, scanConfig: ScanConfig): ScanResult[] {
        return nodes.map((node: NodeResult) => {
            const selector = node.target.join(';');
            const resultId: string = this.hashIdGenerator.generateHashId(scanConfig.scanUrl, selector, node.html, axeResult.id);

            return {
                id: resultId,
                result: {
                    ruleId: axeResult.id,
                    level: level,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: scanConfig.scanUrl,
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
                },
                product: {
                    id: scanConfig.id,
                    name: scanConfig.name,
                    baseUrl: scanConfig.baseUrl,
                    serviceTreeId: scanConfig.serviceTreeId,
                },
            };
        });
    }
}
