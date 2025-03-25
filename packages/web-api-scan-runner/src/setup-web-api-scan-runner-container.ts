// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { Container } from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { setupScannerContainer } from 'scanner-global-library';
import { reporterFactory } from 'accessibility-insights-report';
import { convertAxeToSarif } from 'axe-sarif-converter';
import { iocTypeNames } from './ioc-types';
import { AxeResultToSarifConverter } from './report-generator/axe-result-to-sarif-converter';
import { AxeResultToHtmlConverter } from './report-generator/axe-result-to-html-converter';
import { AxeResultEchoConverter } from './report-generator/axe-result-echo-converter';
import { AxeResultScreenshotConverter } from './report-generator/axe-result-screenshot-converter';
import { AxeResultSnapshotConverter } from './report-generator/axe-result-snapshot-converter';
import { AxeResultConverter } from './agent/axe-result-converter';
import { SarifResultConverter } from './agent/sarif-result-converter';
import { HtmlResultConverter } from './agent/html-result-converter';

export function setupWebApiScanRunnerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true, skipBaseClassChecks: true });
    container.bind(iocTypeNames.ConvertAxeToSarifFunc).toConstantValue(convertAxeToSarif);
    container.bind(iocTypeNames.ReporterFactory).toConstantValue(reporterFactory);

    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);
    setupScannerContainer(container);
    registerReportGeneratorToContainer(container);
    registerAgentReportGeneratorToContainer(container);

    return container;
}

function registerReportGeneratorToContainer(container: Container): void {
    container
        .bind(iocTypeNames.AxeResultConverters)
        .toConstantValue([
            container.get<AxeResultToSarifConverter>(AxeResultToSarifConverter),
            container.get<AxeResultToHtmlConverter>(AxeResultToHtmlConverter),
            container.get<AxeResultEchoConverter>(AxeResultEchoConverter),
            container.get<AxeResultScreenshotConverter>(AxeResultScreenshotConverter),
            container.get<AxeResultSnapshotConverter>(AxeResultSnapshotConverter),
        ]);
}

function registerAgentReportGeneratorToContainer(container: Container): void {
    container
        .bind(iocTypeNames.AgentResultConverters)
        .toConstantValue([
            container.get<AxeResultConverter>(AxeResultConverter),
            container.get<HtmlResultConverter>(HtmlResultConverter),
            container.get<SarifResultConverter>(SarifResultConverter),
        ]);
}
