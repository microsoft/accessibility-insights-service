import { AxeResults } from 'axe-core';
import { IMock, It, Mock, Times } from 'typemoq';

import { ResultConverter } from './result-converter';
import { Product, ProductType, ResultLevel, ScanResult, SourceName } from './scan-result';
import * as sha256 from './sha256';

describe('conver', () => {
    let sha256Mock: IMock<typeof sha256>;
    let resultConverter: ResultConverter;
    const testUrl: string = 'test url';

    beforeEach(() => {
        sha256Mock = Mock.ofType<typeof sha256>();
        resultConverter = new ResultConverter(sha256Mock.object);
    });

    it('should create instance', () => {
        expect(ResultConverter).not.toBeNull();
    });

    it('generate scan result', () => {
        setupHashFunction();
        const axeResults: AxeResults = buildAxeResult();
        const expectedConvertedResult: ScanResult[] = buildExpectedConvertedResult();

        expect(resultConverter.convert(axeResults, buildFakeProductInfo(testUrl))).toMatchObject(expectedConvertedResult);
        sha256Mock.verifyAll();
    });

    function setupHashFunction(): void {
        const expectedHashSeed1: string = 'test url|#class1;#class2|test html1|test rule id1|value0/v1:clientscanneremulator';
        const expectedHashSeed2: string = 'test url|#class3;#class4|test html2|test rule id2|value0/v1:clientscanneremulator';
        sha256Mock
            .setup(b => b.computeHash(It.isValue(expectedHashSeed1)))
            .returns(() => 'scan result id')
            .verifiable(Times.once());
        sha256Mock
            .setup(b => b.computeHash(It.isValue(expectedHashSeed2)))
            .returns(() => 'scan result id')
            .verifiable(Times.once());
    }

    function buildFakeProductInfo(url: string): Product {
        return {
            type: ProductType.web,
            id: 'product id',
            serviceTreeId: 'serviceTree id',
            name: 'product name',
            baseUrl: url,
            version: 'product version',
        };
    }

    function buildAxeResult(): AxeResults {
        return {
            violations: [
                {
                    id: 'test rule id1',
                    impact: 'minor',
                    description: 'test description',
                    help: 'test help',
                    helpUrl: 'test help url',
                    tags: [],
                    nodes: [
                        {
                            html: 'test html1',
                            impact: 'minor',
                            target: ['#class1', '#class2'],
                            any: [],
                            all: [],
                            none: [],
                        },
                    ],
                },
            ],
            passes: [
                {
                    id: 'test rule id2',
                    impact: 'minor',
                    description: 'test description',
                    help: 'test help',
                    helpUrl: 'test help url',
                    tags: [],
                    nodes: [
                        {
                            html: 'test html2',
                            impact: 'minor',
                            target: ['#class3', '#class4'],
                            any: [],
                            all: [],
                            none: [],
                        },
                    ],
                },
            ],
            incomplete: [],
            inapplicable: [],
            url: 'test url',
            timestamp: 'test timestamp',
        };
    }

    // tslint:disable-next-line:max-func-body-length
    function buildExpectedConvertedResult(): ScanResult[] {
        return [
            {
                id: 'scan result id',
                lastUpdated: 'test timestamp',
                productId: 'product id',
                tool: {
                    name: 'KerosWebAgent',
                    fullName: 'KerosWebAgent',
                    version: '1.0.0',
                    semanticVersion: '1.0.0',
                },
                run: {
                    version: '1.0.0',
                    product: {
                        type: ProductType.web,
                        id: 'product id',
                        serviceTreeId: 'serviceTree id',
                        name: 'product name',
                        baseUrl: 'test url',
                        version: 'product version',
                    },
                    scanInfo: {
                        totalResultCount: 2,
                        passedResultCount: 1,
                        failedResultCount: 1,
                    },
                    source: {
                        name: SourceName.accessibility,
                    },
                    pipeline: {
                        name: 'analytics',
                    },
                },
                result: {
                    ruleId: 'test rule id2',
                    level: ResultLevel.pass,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: 'test url',
                                },
                                region: {
                                    snippet: {
                                        text: 'test html2',
                                    },
                                },
                            },
                            fullyQualifiedLogicalName: '#class3;#class4',
                        },
                    ],
                    fingerprints: {
                        'value0/v1': 'ClientScannerEmulator',
                    },
                },
            },
            {
                id: 'scan result id',
                lastUpdated: 'test timestamp',
                productId: 'product id',
                tool: {
                    name: 'KerosWebAgent',
                    fullName: 'KerosWebAgent',
                    version: '1.0.0',
                    semanticVersion: '1.0.0',
                },
                run: {
                    version: '1.0.0',
                    product: {
                        type: ProductType.web,
                        id: 'product id',
                        serviceTreeId: 'serviceTree id',
                        name: 'product name',
                        baseUrl: 'test url',
                        version: 'product version',
                    },
                    scanInfo: {
                        totalResultCount: 2,
                        passedResultCount: 1,
                        failedResultCount: 1,
                    },
                    source: {
                        name: SourceName.accessibility,
                    },
                    pipeline: {
                        name: 'analytics',
                    },
                },
                result: {
                    ruleId: 'test rule id1',
                    level: ResultLevel.error,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: 'test url',
                                },
                                region: {
                                    snippet: {
                                        text: 'test html1',
                                    },
                                },
                            },
                            fullyQualifiedLogicalName: '#class1;#class2',
                        },
                    ],
                    fingerprints: {
                        'value0/v1': 'ClientScannerEmulator',
                    },
                },
            },
        ];
    }
});
