import { AxeResults } from 'axe-core';
import { IMock, Mock, Times } from 'typemoq';
import { ScanMetadata } from '../common-types/scan-metadata';
import { HashGenerator } from '../common/hash-generator';
import { Product, ResultLevel, ScanResult } from '../storage-documents/scan-result';
import { ScanResultConverter } from './scan-result-converter';

describe('ResultConverter', () => {
    let hashIdGeneratorMock: IMock<HashGenerator>;
    let resultConverter: ScanResultConverter;
    const testScanUrl: string = 'test scan url';
    const request: ScanMetadata = {
        websiteId: 'test product id',
        websiteName: 'test name',
        baseUrl: 'test base url',
        scanUrl: testScanUrl,
        serviceTreeId: 'test service tree id',
    };

    beforeEach(() => {
        hashIdGeneratorMock = Mock.ofType<HashGenerator>();
        resultConverter = new ScanResultConverter(hashIdGeneratorMock.object);
    });

    it('generate scan result', () => {
        setupHashFunction();
        const axeResults: AxeResults = buildAxeResult();
        const expectedConvertedResult: ScanResult[] = buildExpectedConvertedResult();

        expect(resultConverter.convert(axeResults, request)).toMatchObject(expectedConvertedResult);
        hashIdGeneratorMock.verifyAll();
    });

    function setupHashFunction(): void {
        hashIdGeneratorMock
            .setup(b => b.generateBase64Hash(testScanUrl, '#class1;#class2', 'test html1', 'test rule id1'))
            .returns(() => 'test id 1')
            .verifiable(Times.once());
        hashIdGeneratorMock
            .setup(b => b.generateBase64Hash(testScanUrl, '#class3;#class4', 'test html2', 'test rule id2'))
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

    // tslint:disable-next-line:max-func-body-length
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
