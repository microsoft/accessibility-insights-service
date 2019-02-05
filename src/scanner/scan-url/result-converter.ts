import { AxeResults, NodeResult, Result } from 'axe-core';
import { Hash } from 'crypto';
import { Product, ResultLevel, ScanInfo, ScanResult, SourceName, Tool } from './scan-result';

export class ResultConverter {
    public constructor(private readonly sha256: Hash) {}

    public convert(axeResults: AxeResults, productInfo: Product): ScanResult[] {
        const results: ScanResult[] = [];
        const toolInfo: Tool = this.buildToolInfo();
        const scanInfo: ScanInfo = {
            totalResultCount: 0,
            passedResultCount: 0,
            failedResultCount: 0,
        };

        axeResults.passes.forEach((axeResult: Result) => {
            scanInfo.passedResultCount += axeResult.nodes.length;
            scanInfo.totalResultCount += axeResult.nodes.length;

            results.push(
                ...this.convertResults(
                    axeResult,
                    axeResult.nodes,
                    scanInfo,
                    productInfo,
                    toolInfo,
                    ResultLevel.pass,
                    axeResults.url,
                    axeResults.timestamp,
                ),
            );
        });

        axeResults.violations.forEach((axeResult: Result) => {
            scanInfo.failedResultCount += axeResult.nodes.length;
            scanInfo.totalResultCount += axeResult.nodes.length;

            results.push(
                ...this.convertResults(
                    axeResult,
                    axeResult.nodes,
                    scanInfo,
                    productInfo,
                    toolInfo,
                    ResultLevel.error,
                    axeResults.url,
                    axeResults.timestamp,
                ),
            );
        });

        return results;
    }

    private buildToolInfo(): Tool {
        return {
            name: 'KerosWebAgent',
            fullName: 'KerosWebAgent',
            version: '1.0.0',
            semanticVersion: '1.0.0',
        };
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

    private convertResults(
        axeResult: Result,
        nodes: NodeResult[],
        scanInfo: ScanInfo,
        productInfo: Product,
        toolInfo: Tool,
        level: ResultLevel,
        url: string,
        timestamp: string,
    ): ScanResult[] {
        return nodes.map((node: NodeResult) => {
            const selector = node.target.join(';');

            const scanResult: ScanResult = {
                id: '',
                lastUpdated: timestamp,
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
                            fullyQualifiedLogicalName: selector,
                        },
                    ],
                    fingerprints: {
                        'value0/v1': 'ClientScannerEmulator',
                    },
                },
            };
            scanResult.id = this.generateScanResultId(url, selector, node.html, axeResult.id, scanResult.result.fingerprints);

            return scanResult;
        });
    }
}
