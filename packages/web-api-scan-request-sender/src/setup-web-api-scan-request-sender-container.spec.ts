// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { ScanRequestSender } from './sender/scan-request-sender';
import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-request-sender-container';
// tslint:disable: no-any

describe(setupWebApiScanRequestSenderContainer, () => {
    it('verify scan request sender dependencies resolution', () => {
        const container = setupWebApiScanRequestSenderContainer();
        expect(container.get(ScanRequestSender)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupWebApiScanRequestSenderContainer();
        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
