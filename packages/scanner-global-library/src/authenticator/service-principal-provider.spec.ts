// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServicePrincipalProvider } from './service-principal-provider';

let servicePrincipalProvider: ServicePrincipalProvider;

describe(ServicePrincipalProvider, () => {
    beforeEach(() => {
        delete process.env.SERVICE_PRINCIPAL_NAME;
        delete process.env.SERVICE_PRINCIPAL_PASSWORD;
        servicePrincipalProvider = new ServicePrincipalProvider();
    });

    it('should create from ctor', () => {
        const defaultServicePrincipal = {
            name: 'name',
            password: 'name',
        };

        servicePrincipalProvider = new ServicePrincipalProvider(defaultServicePrincipal);
        expect(servicePrincipalProvider.getDefaultServicePrincipal()).toEqual(defaultServicePrincipal);
    });

    it('should set empty values', () => {
        const defaultServicePrincipal = {
            name: '',
            password: '',
        };

        expect(servicePrincipalProvider.getDefaultServicePrincipal()).toEqual(defaultServicePrincipal);
    });

    it('should create from process vars', () => {
        process.env.SERVICE_PRINCIPAL_NAME = 'name2';
        process.env.SERVICE_PRINCIPAL_PASSWORD = 'password2';
        const defaultServicePrincipal = {
            name: 'name2',
            password: 'password2',
        };

        servicePrincipalProvider = new ServicePrincipalProvider();

        expect(servicePrincipalProvider.getDefaultServicePrincipal()).toEqual(defaultServicePrincipal);
    });
});
