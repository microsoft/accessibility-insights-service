// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AzureServicesIocTypes, cosmosContainerClientTypes, CredentialType, SecretProvider } from 'azure-services';
import { ServiceConfiguration } from 'common';
import * as inversify from 'inversify';
import { Logger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { A11yServiceClientProvider, a11yServiceClientTypeNames } from 'web-api-client';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';

describe(getProcessLifeCycleContainer, () => {
    let testSubject: inversify.Container;
    let secretProviderMock: IMock<SecretProvider>;

    beforeEach(() => {
        testSubject = getProcessLifeCycleContainer();
        secretProviderMock = Mock.ofType(SecretProvider);

        testSubject.unbind(SecretProvider);
        testSubject.bind(SecretProvider).toConstantValue(secretProviderMock.object);
    });

    it('verifies dependencies resolution', () => {
        expect(testSubject.get(ServiceConfiguration)).toBeDefined();
        expect(testSubject.get(Logger)).toBeDefined();
        expect(testSubject.get(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient)).toBeDefined();
    });

    it('verifies A11yServiceClient registration', async () => {
        secretProviderMock
            .setup(async s => s.getSecret('restApiSpAppId'))
            .returns(async () => Promise.resolve('sp app id'))
            .verifiable();
        secretProviderMock
            .setup(async s => s.getSecret('restApiSpSecret'))
            .returns(async () => Promise.resolve('sp app secret'))
            .verifiable();
        secretProviderMock
            .setup(async s => s.getSecret('authorityUrl'))
            .returns(async () => Promise.resolve('https://login.microsoft.com/tenantid'))
            .verifiable();

        const a11yServiceClientProvider1 = testSubject.get<A11yServiceClientProvider>(a11yServiceClientTypeNames.A11yServiceClientProvider);
        const a11yServiceClientProvider2 = testSubject.get<A11yServiceClientProvider>(a11yServiceClientTypeNames.A11yServiceClientProvider);

        await expect(a11yServiceClientProvider1()).resolves.toBeDefined();
        expect(await a11yServiceClientProvider1()).toBe(await a11yServiceClientProvider2());
        secretProviderMock.verifyAll();
    });

    it('should not create more than one instance of container', () => {
        expect(getProcessLifeCycleContainer()).toBe(testSubject);
    });

    it('verifies credential type to be app service', () => {
        expect(testSubject.get(AzureServicesIocTypes.CredentialType)).toBe(CredentialType.AppService);
    });
});
