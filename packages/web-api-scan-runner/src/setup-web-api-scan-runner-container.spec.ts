// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { Runner } from './runner/runner';
import { setupWebApiScanRunnerContainer } from './setup-web-api-scan-runner-container';
/* eslint-disable @typescript-eslint/no-explicit-any */

describe(setupWebApiScanRunnerContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupWebApiScanRunnerContainer();

        expect(container.get(Runner)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupWebApiScanRunnerContainer();

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
