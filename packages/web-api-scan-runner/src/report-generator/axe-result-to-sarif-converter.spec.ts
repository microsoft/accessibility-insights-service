// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { IMock, Mock, Times } from 'typemoq';
import { ReportResult } from 'scanner-global-library';
import { AxeResultToSarifConverter } from './axe-result-to-sarif-converter';

describe('AxeResultToSarifConverter', () => {
    let axeSarifResultConverter: AxeResultToSarifConverter;
    let sarifReport: SarifLog;
    let convertAxeToSarifFuncMock: IMock<(axeResults: AxeResults) => SarifLog>;
    let axeScanResults: ReportResult;

    beforeEach(() => {
        sarifReport = { sarifLog: true } as unknown as SarifLog;
        convertAxeToSarifFuncMock = Mock.ofInstance(() => sarifReport);
        axeSarifResultConverter = new AxeResultToSarifConverter(convertAxeToSarifFuncMock.object);
        axeScanResults = {
            result: {
                url: 'url',
            },
        } as unknown as ReportResult;
    });

    it('has correct report type', () => {
        expect(axeSarifResultConverter.targetReportFormat).toEqual('sarif');
    });

    it('convert', () => {
        convertAxeToSarifFuncMock
            .setup((o) => o(axeScanResults.axeResults))
            .returns(() => sarifReport)
            .verifiable(Times.once());

        const report = axeSarifResultConverter.convert(axeScanResults);

        convertAxeToSarifFuncMock.verifyAll();
        expect(report).toEqual(JSON.stringify(sarifReport));
    });
});
