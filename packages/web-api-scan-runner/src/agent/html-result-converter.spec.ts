// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { Reporter, ReporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { AgentResults } from '../scanner/agent-scanner';
import { HtmlResultConverter } from './html-result-converter';

describe(HtmlResultConverter, () => {
    let reporterMock: IMock<Reporter>;
    let reporterFactoryMock: IMock<ReporterFactory>;
    let htmlResultConverter: HtmlResultConverter;

    const axeResultsStub = {
        url: 'https://example.com',
        passes: [],
        violations: [],
        incomplete: [],
        inapplicable: [],
        timestamp: '2025-03-18T12:00:00.000Z',
    } as AxeResults;

    const agentResultsStub: AgentResults = {
        result: 'completed',
        scannedUrl: 'https://example.com',
        axeResults: axeResultsStub,
    };

    const htmlReportStub = '<html><body>Accessibility Report</body></html>';

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        reporterFactoryMock = Mock.ofType<ReporterFactory>();

        reporterMock
            .setup((reporter) => reporter.fromAxeResult(It.isAny()))
            .returns(() => ({
                asHTML: () => htmlReportStub,
            }))
            .verifiable(Times.once());

        reporterFactoryMock
            .setup((factory) => factory())
            .returns(() => reporterMock.object)
            .verifiable(Times.once());

        htmlResultConverter = new HtmlResultConverter(reporterFactoryMock.object);
    });

    it('should convert AxeResults to HTML format', () => {
        const result = htmlResultConverter.convert(agentResultsStub);

        expect(result).toEqual(htmlReportStub);

        reporterFactoryMock.verifyAll();
        reporterMock.verifyAll();
    });

    it('should have the correct target report format', () => {
        expect(htmlResultConverter.targetReportFormat).toEqual('html');
    });
});
