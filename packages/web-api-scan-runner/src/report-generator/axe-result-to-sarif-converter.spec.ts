// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { IMock, Mock, Times } from 'typemoq';
import { AxeResultToSarifConverter } from './axe-result-to-sarif-converter';

describe('AxeResultToSarifConverter', () => {
    let axeSarifResultConverter: AxeResultToSarifConverter;
    let sarifReport: SarifLog;
    let convertAxeToSarifFuncMock: IMock<(axeResults: AxeResults) => SarifLog>;
    let axeResults: AxeResults;

    beforeEach(() => {
        sarifReport = ({ sarifLog: true } as unknown) as SarifLog;
        convertAxeToSarifFuncMock = Mock.ofInstance((ar: AxeResults) => sarifReport);
        axeSarifResultConverter = new AxeResultToSarifConverter(convertAxeToSarifFuncMock.object);
        axeResults = ({
            testResults: true,
        } as unknown) as AxeResults;
    });

    it('has correct report type', () => {
        expect(axeSarifResultConverter.targetReportFormat).toEqual('sarif');
    });

    it('convert', () => {
        convertAxeToSarifFuncMock
            .setup((f) => f(axeResults))
            .returns(() => sarifReport)
            .verifiable(Times.once());

        const report = axeSarifResultConverter.convert(axeResults);

        convertAxeToSarifFuncMock.verifyAll();
        expect(report).toEqual(JSON.stringify(sarifReport));
    });
});
