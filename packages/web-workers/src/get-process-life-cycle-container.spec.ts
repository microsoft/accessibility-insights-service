// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CredentialsProvider, SecretProvider } from 'azure-services';
import { ServiceConfiguration } from 'common';
import * as inversify from 'inversify';
import { GlobalLogger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { A11yServiceClientProvider, a11yServiceClientTypeNames } from 'web-api-client';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';

describe(getProcessLifeCycleContainer, () => {
    let iocContainer: inversify.Container;
    let secretProviderMock: IMock<SecretProvider>;

    beforeEach(() => {
        iocContainer = getProcessLifeCycleContainer();
        secretProviderMock = Mock.ofType(SecretProvider);

        iocContainer.unbind(SecretProvider);
        iocContainer.bind(SecretProvider).toConstantValue(secretProviderMock.object);
    });

    it('verifies dependencies resolution', () => {
        expect(iocContainer.get(ServiceConfiguration)).toBeDefined();
        expect(iocContainer.get(GlobalLogger)).toBeDefined();

        expect(iocContainer.get(CredentialsProvider)).toBeDefined();
        expect(iocContainer.get(SecretProvider)).toBeDefined();
        expect(iocContainer.get(CredentialsProvider)).toBeDefined();
    });

    it('verifies A11yServiceClient registration', async () => {
        secretProviderMock
            .setup(async (s) => s.getSecret('webApiIdentityClientId'))
            .returns(async () => Promise.resolve('sp app id'))
            .verifiable();

        const a11yServiceClientProvider1 = iocContainer.get<A11yServiceClientProvider>(
            a11yServiceClientTypeNames.A11yServiceClientProvider,
        );
        const a11yServiceClientProvider2 = iocContainer.get<A11yServiceClientProvider>(
            a11yServiceClientTypeNames.A11yServiceClientProvider,
        );

        await expect(a11yServiceClientProvider1()).resolves.toBeDefined();
        expect(await a11yServiceClientProvider1()).toBe(await a11yServiceClientProvider2());
        secretProviderMock.verifyAll();
    });

    it('should not create more than one instance of container', () => {
        expect(getProcessLifeCycleContainer()).toBe(iocContainer);
    });
});
