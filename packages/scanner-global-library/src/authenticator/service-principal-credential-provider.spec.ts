// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServicePrincipalCredentialProvider } from './service-principal-credential-provider';

let servicePrincipalProvider: ServicePrincipalCredentialProvider;

describe(ServicePrincipalCredentialProvider, () => {
    beforeEach(() => {
        delete process.env.AZURE_AUTH_CLIENT_NAME;
        delete process.env.AZURE_AUTH_CLIENT_PASSWORD;
        servicePrincipalProvider = new ServicePrincipalCredentialProvider();
    });

    it('should create from credential provider', async () => {
        const servicePrincipal = {
            name: 'name',
            password: 'name',
        };

        servicePrincipalProvider = new ServicePrincipalCredentialProvider(() => Promise.resolve(servicePrincipal));
        const credential = await servicePrincipalProvider.getAzureAuthClientCredential();
        expect(credential).toEqual(servicePrincipal);
    });

    it('should normalize credential empty values', async () => {
        const servicePrincipal = {
            name: '',
            password: '',
        };

        const credential = await servicePrincipalProvider.getAzureAuthClientCredential();
        expect(credential).toEqual(servicePrincipal);
    });

    it('should create from environment variables', async () => {
        process.env.AZURE_AUTH_CLIENT_NAME = 'name2';
        process.env.AZURE_AUTH_CLIENT_PASSWORD = 'password2';
        const servicePrincipal = {
            name: 'name2',
            password: 'password2',
        };

        const credential = await servicePrincipalProvider.getAzureAuthClientCredential();
        expect(credential).toEqual(servicePrincipal);
    });
});
