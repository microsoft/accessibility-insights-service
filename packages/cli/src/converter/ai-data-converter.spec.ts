// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { CombinedReportDataConverter } from 'axe-result-converter';
import { AICombinedReportDataConverter } from './ai-data-converter';
import { CombinedReportParameters } from 'accessibility-insights-report';

let combinedReportDataConverterMock: IMock<CombinedReportDataConverter>;
let testSubject: AICombinedReportDataConverter;

describe(AICombinedReportDataConverter, () => {
    beforeEach(() => {
        combinedReportDataConverterMock = Mock.ofType<CombinedReportDataConverter>();

        testSubject = new AICombinedReportDataConverter(combinedReportDataConverterMock.object);
    });

    afterEach(() => {
        combinedReportDataConverterMock.verifyAll();
    });

    it('convert', () => {
        const CombinedReportParameters = {} as CombinedReportParameters;
        combinedReportDataConverterMock
            .setup((o) => o.convert(It.isAny(), It.isAny()))
            .returns(() => CombinedReportParameters)
            .verifiable();

        testSubject.convertCrawlingResults(null, null);
    });
});
