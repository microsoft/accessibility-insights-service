// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { Runner } from './runner/runner';
import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-runner-container';
// tslint:disable: no-any

describe(setupWebApiScanRequestSenderContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupWebApiScanRequestSenderContainer();

        expect(container.get(Runner)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupWebApiScanRequestSenderContainer();

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
