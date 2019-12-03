// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { convertAxeToSarif } from 'axe-sarif-converter';
import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { reporterFactory } from 'markreay-accessibility-insights-report';
import { registerScannerToContainer } from 'scanner';
import { registerServiceLibraryToContainer } from 'service-library';
import { iocTypeNames } from './ioc-types';
import { AxeResultToHtmlConverter, AxeResultToSarifConverter } from './report-generator/axe-result-converters';
import { ReportGenerator } from './report-generator/report-generator';

export function setupWebApiScanRequestSenderContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);
    registerScannerToContainer(container);
    registerServiceLibraryToContainer(container);

    container.bind(iocTypeNames.ConvertAxeToSarifFunc).toConstantValue(convertAxeToSarif);
    container.bind(iocTypeNames.ReporterFactory).toConstantValue(reporterFactory);
    container.bind(iocTypeNames.AxeResultConverters).toConstantValue([
        container.get<AxeResultToSarifConverter>(AxeResultToSarifConverter),
        container.get<AxeResultToHtmlConverter>(AxeResultToHtmlConverter),
    ]);

    return container;
}
