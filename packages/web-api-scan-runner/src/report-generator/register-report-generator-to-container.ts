// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reporterFactory } from 'accessibility-insights-report';
import { convertAxeToSarif } from 'axe-sarif-converter';
import { Container } from 'inversify';
import { iocTypeNames } from '../ioc-types';
import { AxeResultToHtmlConverter } from './axe-result-to-html-converter';
import { AxeResultToSarifConverter } from './axe-result-to-sarif-converter';

export function registerReportGeneratorToContainer(container: Container): void {
    container.bind(iocTypeNames.ConvertAxeToSarifFunc).toConstantValue(convertAxeToSarif);
    container.bind(iocTypeNames.ReporterFactory).toConstantValue(reporterFactory);
    container
        .bind(iocTypeNames.AxeResultConverters)
        .toConstantValue([
            container.get<AxeResultToSarifConverter>(AxeResultToSarifConverter),
            container.get<AxeResultToHtmlConverter>(AxeResultToHtmlConverter),
        ]);
}
