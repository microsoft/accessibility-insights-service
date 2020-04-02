// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { reporterFactory } from 'accessibility-insights-report';
import { convertAxeToSarif } from 'axe-sarif-converter';
import { Container } from 'inversify';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';
import { registerReportGeneratorToContainer } from './register-report-generator-to-container';

describe('registerReportGeneratorToContainer', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        registerReportGeneratorToContainer(container);
    });

    it('container has convertAxeToSarif function', () => {
        expect(container.get(iocTypeNames.ConvertAxeToSarifFunc)).toBe(convertAxeToSarif);
    });

    it('container has html reporterFactory', () => {
        expect(container.get(iocTypeNames.ReporterFactory)).toBe(reporterFactory);
    });

    it('container has both sarif and html report generators', () => {
        const axeResultConverters: AxeResultConverter[] = container.get(iocTypeNames.AxeResultConverters);
        expect(axeResultConverters.length).toBe(2);

        const axeResultConverterTypes = axeResultConverters.map((converter) => converter.targetReportFormat);
        expect(axeResultConverterTypes).toContain('html');
        expect(axeResultConverterTypes).toContain('sarif');
    });
});
