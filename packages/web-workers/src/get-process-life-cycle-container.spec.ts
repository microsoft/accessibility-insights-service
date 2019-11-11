// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AzureServicesIocTypes, cosmosContainerClientTypes, CredentialType } from 'azure-services';
import { ServiceConfiguration } from 'common';
import * as inversify from 'inversify';
import { Logger } from 'logger';
import { A11yServiceClient } from 'web-api-client';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';

describe(getProcessLifeCycleContainer, () => {
    let testSubject: inversify.Container;
    beforeEach(() => {
        testSubject = getProcessLifeCycleContainer();
    });

    it('verifies dependencies resolution', () => {
        expect(testSubject.get(ServiceConfiguration)).toBeDefined();
        expect(testSubject.get(Logger)).toBeDefined();
        expect(testSubject.get(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient)).toBeDefined();
        expect(testSubject.get(A11yServiceClient)).toBeDefined();
    });

    it('should not create more than one instance of container', () => {
        expect(getProcessLifeCycleContainer()).toBe(testSubject);
    });

    it('verifies credential type to be app service', () => {
        expect(testSubject.get(AzureServicesIocTypes.CredentialType)).toBe(CredentialType.AppService);
    });
});
