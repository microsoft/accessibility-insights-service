import { AxeResults, NodeResult, Result } from 'axe-core';
import { ScanRequest } from '../common/data-contract';
import { HashIdGenerator } from './hash-id-generator';
import { ResultLevel, ScanResult } from './scan-result';

export class ResultConverter {
    public constructor(private readonly hashIdGenerator: HashIdGenerator) {}

    public convert(axeResults: AxeResults, request: ScanRequest): ScanResult[] {
        const results: ScanResult[] = [];

        axeResults.violations.forEach((axeResult: Result) => {
            results.push(...this.convertResults(axeResult, axeResult.nodes, ResultLevel.error, request));
        });

        return results;
    }

    private convertResults(axeResult: Result, nodes: NodeResult[], level: ResultLevel, request: ScanRequest): ScanResult[] {
        return nodes.map((node: NodeResult) => {
            const selector = node.target.join(';');
            const resultId: string = this.hashIdGenerator.generateHashId(request.scanUrl, selector, node.html, axeResult.id);

            return {
                id: resultId,
                result: {
                    ruleId: axeResult.id,
                    level: level,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: request.scanUrl,
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
                    id: request.id,
                    name: request.name,
                    baseUrl: request.baseUrl,
                    serviceTreeId: request.serviceTreeId,
                },
            };
        });
    }
}
