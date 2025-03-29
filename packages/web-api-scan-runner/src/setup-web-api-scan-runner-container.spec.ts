// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { Container } from 'inversify';
import { Runner } from './runner/runner';
import { setupWebApiScanRunnerContainer } from './setup-web-api-scan-runner-container';
import { iocTypeNames } from './ioc-types';
import { AxeResultConverter } from './report-generator/axe-result-converter';
import { AgentResultConverter } from './agent/agent-result-converter';

/* eslint-disable @typescript-eslint/no-explicit-any */

let container: Container;

describe(setupWebApiScanRunnerContainer, () => {
    it('resolves runner dependencies', () => {
        container = setupWebApiScanRunnerContainer();

        expect(container.get(Runner)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        container = setupWebApiScanRunnerContainer();

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });

    it('container has all required report generators', () => {
        container = setupWebApiScanRunnerContainer();

        const axeResultConverters: AxeResultConverter[] = container.get(iocTypeNames.AxeResultConverters);
        const axeResultConverterTypes = axeResultConverters.map((converter) => converter.targetReportFormat);
        expect(axeResultConverterTypes).toContain('html');
        expect(axeResultConverterTypes).toContain('sarif');
        expect(axeResultConverterTypes).toContain('axe');
        expect(axeResultConverterTypes).toContain('page.png');
        expect(axeResultConverterTypes).toContain('page.mhtml');
    });

    it('container has all required agent report generators', () => {
        container = setupWebApiScanRunnerContainer();

        const agentResultConverters: AgentResultConverter[] = container.get(iocTypeNames.AgentResultConverters);
        const agentResultConverterTypes = agentResultConverters.map((converter) => converter.targetReportFormat);
        expect(agentResultConverterTypes).toContain('axe');
        expect(agentResultConverterTypes).toContain('html');
        expect(agentResultConverterTypes).toContain('sarif');
    });
});
