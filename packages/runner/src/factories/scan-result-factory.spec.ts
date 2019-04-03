// tslint:disable: no-import-side-effect max-func-body-length
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { IMock, Mock, Times } from 'typemoq';
import { HashGenerator } from '../common/hash-generator';
import { Product, ResultLevel, ScanResult } from '../documents/issue-scan-result';
import { ItemType } from '../documents/item-type';
import { ScanMetadata } from '../types/scan-metadata';
import { ScanResultFactory } from './scan-result-factory';

describe('ScanResultFactory', () => {
    let hashGeneratorMock: IMock<HashGenerator>;
    let scanResultFactory: ScanResultFactory;
    const testScanUrl: string = 'test scan url';
    const scanMetadata: ScanMetadata = {
        websiteId: 'test product id',
        websiteName: 'test name',
        baseUrl: 'test base url',
        scanUrl: testScanUrl,
        serviceTreeId: 'test service tree id',
    };

    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        scanResultFactory = new ScanResultFactory(hashGeneratorMock.object);
    });

    it('generate scan result', () => {
        setupHashFunction();
        const axeResults: AxeResults = buildAxeResult();
        const expectedConvertedResult: ScanResult[] = buildExpectedConvertedResult();

        expect(scanResultFactory.create(axeResults, scanMetadata)).toMatchObject(expectedConvertedResult);
        hashGeneratorMock.verifyAll();
    });

    function setupHashFunction(): void {
        hashGeneratorMock
            .setup(b => b.getScanResultDocumentId(testScanUrl, '#class1;#class2', 'test html1', 'test rule id1'))
            .returns(() => 'test id 1')
            .verifiable(Times.once());
        hashGeneratorMock
            .setup(b => b.getScanResultDocumentId(testScanUrl, '#class3;#class4', 'test html2', 'test rule id2'))
            .returns(() => 'test id 2')
            .verifiable(Times.once());
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
            passes: [
                {
                    id: 'test rule id3',
                    impact: 'minor',
                    description: 'test description',
                    help: 'test help',
                    helpUrl: 'test help url',
                    tags: [],
                    nodes: [
                        {
                            html: 'test html3',
                            impact: 'minor',
                            target: ['#class5', '#class6'],
                            any: [],
                            all: [],
                            none: [],
                        },
                    ],
                },
            ],
            incomplete: [],
            inapplicable: [],
            url: testScanUrl,
            timestamp: 'test timestamp',
        };
    }

    function buildExpectedConvertedResult(): ScanResult[] {
        const productInfo: Product = {
            id: 'test product id',
            name: 'test name',
            baseUrl: 'test base url',
            serviceTreeId: 'test service tree id',
        };

        return [
            {
                id: 'test id 1',
                itemType: ItemType.issueScanResult,
                result: {
                    ruleId: 'test rule id1',
                    level: ResultLevel.error,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: testScanUrl,
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
                },
                product: productInfo,
            },
            {
                id: 'test id 2',
                itemType: ItemType.issueScanResult,
                result: {
                    ruleId: 'test rule id2',
                    level: ResultLevel.error,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: testScanUrl,
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
                },
                product: productInfo,
            },
        ];
    }
});
