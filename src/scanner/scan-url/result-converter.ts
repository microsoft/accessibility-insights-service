import { AxeResults, Result, NodeResult } from 'axe-core';
import { Product, ScanInfo, ScanResult, Tool, SourceName, ResultLevel } from './scan-result';

export class ResultConverter {
    public convert(axeResults: AxeResults, productInfo: Product, toolInfo: Tool): ScanResult[] {
        const results: ScanResult[] = [];
        const scanInfo: ScanInfo = {
            totalResultCount: 0,
            passedResultCount: 0,
            failedResultCount: 0,
        };
        axeResults.passes.forEach((axeResult: Result) => {
            scanInfo.passedResultCount += axeResult.nodes.length;
            scanInfo.totalResultCount += axeResult.nodes.length;

            this.convertResults(axeResult, axeResult.nodes, scanInfo, productInfo, toolInfo, ResultLevel.pass, axeResults.url);
        });

        axeResults.violations.forEach((axeResult: Result) => {
            scanInfo.failedResultCount += axeResult.nodes.length;
            scanInfo.totalResultCount += axeResult.nodes.length;

            this.convertResults(axeResult, axeResult.nodes, scanInfo, productInfo, toolInfo, ResultLevel.error, axeResults.url);
        });

        return results;
    }

    private convertResults(
        axeResult: Result,
        nodes: NodeResult[],
        scanInfo: ScanInfo,
        productInfo: Product,
        toolInfo: Tool,
        level: ResultLevel,
        url: string
    ): ScanResult[] {

        return nodes.map((node: NodeResult) => {
            const selector = node.target.join(';');

            return {
                id: 'to be generated by hash function',
                lastUpdated: 'to be generated on cosmos db insertion',
                productId: productInfo.id,
                tool: toolInfo,
                run: {
                    version: toolInfo.version,
                    product: productInfo,
                    source: {
                        name: SourceName.accessibility,
                    },
                    pipeline: {
                        name: 'analytics',
                    },
                    scanInfo: scanInfo,
                },
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
                            fullyQualifiedLogicalName: selector
                        },
                    ],
                    fingerprints: {
                        'value0/v1': 'ClientScannerEmulator'
                    }
                },
            };
        });
    }
}