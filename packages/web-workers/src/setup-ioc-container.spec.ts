// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { cosmosContainerClientTypes } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { setupIoContainer } from './setup-ioc-container';

describe(setupIoContainer, () => {
    it('verify dependencies resolution', () => {
        const container = setupIoContainer();
        expect(container.get(ServiceConfiguration)).toBeDefined();
        expect(container.get(Logger)).toBeDefined();
        expect(container.get(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient)).toBeDefined();
    });
});
