// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { TokenCredential } from '@azure/identity';
import { CredentialsProvider } from 'azure-services';
import { ServiceConfiguration } from 'common';
import * as inversify from 'inversify';
import { GlobalLogger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';
import { ApplicationInsightsClientProvider, webApiTypeNames } from './web-api-types';

describe(getProcessLifeCycleContainer, () => {
    let testSubject: inversify.Container;
    //let secretProviderMock: IMock<SecretProvider>;
    let credentialsProviderMock: IMock<CredentialsProvider>;

    beforeEach(() => {
        process.env.APPINSIGHTS_APPID = 'app insights app id';
        testSubject = getProcessLifeCycleContainer();
        credentialsProviderMock = Mock.ofType(CredentialsProvider);

        testSubject.unbind(CredentialsProvider);
        testSubject.bind(CredentialsProvider).toConstantValue(credentialsProviderMock.object);
    });

    afterEach(() => {
        delete process.env.APPINSIGHTS_APPID;
    });

    it('verifies dependencies resolution', () => {
        expect(testSubject.get(ServiceConfiguration)).toBeDefined();
        expect(testSubject.get(GlobalLogger)).toBeDefined();

        expect(testSubject.get(CredentialsProvider)).toBeDefined();
        //expect(testSubject.get(SecretProvider)).toBeDefined();
        expect(testSubject.get(CredentialsProvider)).toBeDefined();
    });

    it('should not create more than one instance of container', () => {
        expect(getProcessLifeCycleContainer()).toBe(testSubject);
    });

    it('verifies A11yServiceClient registration', async () => {
        const testCredential = {} as TokenCredential;
        credentialsProviderMock
            .setup((o) => o.getAzureCredential())
            .returns(() => testCredential)
            .verifiable();

        const applicationInsightsClientProvider1 = testSubject.get<ApplicationInsightsClientProvider>(
            webApiTypeNames.ApplicationInsightsClientProvider,
        );
        const applicationInsightsClientProvider2 = testSubject.get<ApplicationInsightsClientProvider>(
            webApiTypeNames.ApplicationInsightsClientProvider,
        );

        await expect(applicationInsightsClientProvider1()).resolves.toBeDefined();
        expect(await applicationInsightsClientProvider1()).toBe(await applicationInsightsClientProvider2());
        credentialsProviderMock.verifyAll();
    });
});
