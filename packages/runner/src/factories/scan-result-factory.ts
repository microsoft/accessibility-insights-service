import { AxeResults, NodeResult, Result } from 'axe-core';
import { HashGenerator } from 'axis-storage';
import { inject, injectable } from 'inversify';
import { ResultLevel, ScanResult } from '../documents/issue-scan-result';
import { ItemType } from '../documents/item-type';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class ScanResultFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public create(axeResults: AxeResults, scanConfig: ScanMetadata): ScanResult[] {
        const results: ScanResult[] = [];

        axeResults.violations.forEach((axeResult: Result) => {
            results.push(...this.convertResults(axeResult, axeResult.nodes, ResultLevel.error, scanConfig));
        });

        return results;
    }

    private convertResults(axeResult: Result, nodes: NodeResult[], level: ResultLevel, scanConfig: ScanMetadata): ScanResult[] {
        return nodes.map((node: NodeResult) => {
            const selector = node.target.join(';');

            // preserve preserve order for the hash compatibility
            const resultId: string = this.hashGenerator.getScanResultDocumentId(scanConfig.scanUrl, selector, node.html, axeResult.id);

            return {
                id: resultId,
                itemType: ItemType.issueScanResult,
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
                    id: scanConfig.websiteId,
                    name: scanConfig.websiteName,
                    baseUrl: scanConfig.baseUrl,
                    serviceTreeId: scanConfig.serviceTreeId,
                },
            };
        });
    }
}
