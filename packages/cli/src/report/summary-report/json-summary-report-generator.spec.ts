// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { cloneDeep } from 'lodash';
import { JsonSummaryReportGenerator } from './json-summary-report-generator';
import { SummaryReportData } from './summary-report-data';
// tslint:disable: no-object-literal-type-assertion

describe(JsonSummaryReportGenerator, () => {
    let testSubject: JsonSummaryReportGenerator;

    beforeEach(() => {
        testSubject = new JsonSummaryReportGenerator();
    });

    test.each([
        [
            'has violations',
            {
                failedUrlToReportMap: { url1: 'file1' },
                passedUrlToReportMap: { url1: 'file1' },
                violationCountByRuleMap: {
                    rule1WithALongName11111111111111111: 10,
                    rule2: 3,
                },
                unscannableUrls: [],
            } as SummaryReportData,
        ],
        [
            'has no violations',
            {
                failedUrlToReportMap: { url1: 'file1' },
                passedUrlToReportMap: { url1: 'file1' },
                violationCountByRuleMap: {},
                unscannableUrls: [],
            } as SummaryReportData,
        ],
    ])('logs violation summary when %s', async (testCaseName, testCase) => {
        const result = testSubject.generateReport(cloneDeep(testCase));

        expect(JSON.parse(result)).toEqual(testCase.violationCountByRuleMap);
    });
});
