import { AxeResults } from 'axe-core';
import { IMock, It, Mock, Times } from 'typemoq';

import { Hash } from 'crypto';
import { ResultConverter } from './result-converter';
import { ResultLevel, ScanResult } from './scan-result';

describe('conver', () => {
    let sha256Mock: IMock<Hash>;
    let resultConverter: ResultConverter;
    const testUrl: string = 'test url';
    let returnedHashMock: IMock<Hash>;

    beforeEach(() => {
        sha256Mock = Mock.ofType<Hash>();
        returnedHashMock = Mock.ofType<Hash>();
        resultConverter = new ResultConverter(sha256Mock.object);
    });

    it('should create instance', () => {
        expect(ResultConverter).not.toBeNull();
    });

    it('generate scan result', () => {
        setupHashFunction();
        const axeResults: AxeResults = buildAxeResult();
        const expectedConvertedResult: ScanResult[] = buildExpectedConvertedResult();

        expect(resultConverter.convert(axeResults)).toMatchObject(expectedConvertedResult);
        sha256Mock.verifyAll();
        returnedHashMock.verifyAll();
    });

    function setupHashFunction(): void {
        const expectedHashSeed1: string = 'test url|#class1;#class2|test html1|test rule id1';
        const expectedHashSeed2: string = 'test url|#class3;#class4|test html2|test rule id2';
        sha256Mock
            .setup(b => b.update(It.isValue(expectedHashSeed1)))
            .returns(() => returnedHashMock.object)
            .verifiable(Times.once());
        sha256Mock
            .setup(b => b.update(It.isValue(expectedHashSeed2)))
            .returns(() => returnedHashMock.object)
            .verifiable(Times.once());

        returnedHashMock
            .setup(b => b.digest(It.isValue('hex')))
            .returns(() => 'scan result id')
            .verifiable(Times.exactly(2));
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
            passes: [],
            incomplete: [],
            inapplicable: [],
            url: testUrl,
            timestamp: 'test timestamp',
        };
    }

    // tslint:disable-next-line:max-func-body-length
    function buildExpectedConvertedResult(): ScanResult[] {
        return [
            {
                id: 'scan result id',
                result: {
                    ruleId: 'test rule id1',
                    level: ResultLevel.error,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: testUrl,
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
            },
            {
                id: 'scan result id',
                result: {
                    ruleId: 'test rule id2',
                    level: ResultLevel.error,
                    locations: [
                        {
                            physicalLocation: {
                                fileLocation: {
                                    uri: testUrl,
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
            },
        ];
    }
});
