// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AzureServicesIocTypes, cosmosContainerClientTypes, CredentialType } from 'azure-services';
import { ServiceConfiguration } from 'common';
import * as inversify from 'inversify';
import { Logger } from 'logger';
import { setupIoContainer } from './setup-ioc-container';

describe(setupIoContainer, () => {
    let testSubject: inversify.Container;
    beforeEach(() => {
        testSubject = setupIoContainer();
    });

    it('verifies dependencies resolution', () => {
        expect(testSubject.get(ServiceConfiguration)).toBeDefined();
        expect(testSubject.get(Logger)).toBeDefined();
        expect(testSubject.get(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient)).toBeDefined();
    });

    it('verifies credential type to be app service', () => {
        expect(testSubject.get(AzureServicesIocTypes.CredentialType)).toBe(CredentialType.AppService);
    });
});
