// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';

import { Logger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { registerServiceLibraryToContainer } from './register-service-library-to-container';
import { MockableLogger } from './test-utilities/mockable-logger';
import { WebDriver } from './web-driver/web-driver';

// tslint:disable: no-unsafe-any no-any

describe(registerServiceLibraryToContainer, () => {
    let container: Container;
    let loggerMock: IMock<MockableLogger>;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        loggerMock = Mock.ofType(MockableLogger);

        container.bind(Logger).toConstantValue(loggerMock.object);
    });

    it('should verify singleton resolution', () => {
        registerServiceLibraryToContainer(container);

        verifySingletonResolution(WebDriver);
    });

    function verifySingletonResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toBe(container.get(key));
    }
});
