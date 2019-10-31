// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';

import { registerWebApiClientLibraryToContainer } from './register-web-api-client-library-to-container';
import { WebApiClient } from './web-api-client';

// tslint:disable: no-unsafe-any no-any

describe(registerWebApiClientLibraryToContainer, () => {
    let container: Container;
    let clientMock: IMock<WebApiClient>;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        clientMock = Mock.ofType(WebApiClient);
    });

    it('should verify scanner resolution', () => {
        registerWebApiClientLibraryToContainer(container);

        const client = container.get(WebApiClient);

        expect(client).toBeDefined();
        expect(client).toBeInstanceOf(WebApiClient);
    });
});
