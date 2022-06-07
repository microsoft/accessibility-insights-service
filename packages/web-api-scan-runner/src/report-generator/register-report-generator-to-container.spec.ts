// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

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

    it('container has all required report generators', () => {
        const axeResultConverters: AxeResultConverter[] = container.get(iocTypeNames.AxeResultConverters);
        const axeResultConverterTypes = axeResultConverters.map((converter) => converter.targetReportFormat);
        expect(axeResultConverterTypes).toContain('html');
        expect(axeResultConverterTypes).toContain('sarif');
        expect(axeResultConverterTypes).toContain('axe');
        expect(axeResultConverterTypes).toContain('png');
        expect(axeResultConverterTypes).toContain('mhtml');
    });
});
