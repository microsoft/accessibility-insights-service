// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { GlobalLogger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { registerScannerToContainer } from './register-scanner-to-container';
import { MockableLogger } from './test-utilities/mockable-logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(registerScannerToContainer, () => {
    let container: Container;
    let loggerMock: IMock<MockableLogger>;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        loggerMock = Mock.ofType(MockableLogger);

        container.bind(GlobalLogger).toConstantValue(loggerMock.object);
    });

    it('should verify singleton resolution', () => {
        registerScannerToContainer(container);

        verifySingletonResolution(AxePuppeteerFactory);
    });

    function verifySingletonResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toBe(container.get(key));
    }
});
