// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';

import { A11yServiceClient } from './a11y-service-client';
import { registerWebApiClientLibraryToContainer } from './register-web-api-client-to-container';

// tslint:disable: no-unsafe-any no-any

describe(registerWebApiClientLibraryToContainer, () => {
    let container: Container;
    let clientMock: IMock<A11yServiceClient>;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        clientMock = Mock.ofType(A11yServiceClient);
    });

    it('should verify scanner resolution', () => {
        registerWebApiClientLibraryToContainer(container);

        const client = container.get(A11yServiceClient);

        expect(client).toBeDefined();
        expect(client).toBeInstanceOf(A11yServiceClient);
    });
});
