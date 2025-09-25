// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { setupScannerContainer } from './setup-scanner-container';
import { PuppeteerTimeoutConfig } from './page-timeout-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(setupScannerContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        setupScannerContainer(container);
    });

    it('PuppeteerTimeoutConfig should be singleton', () => {
        const obj1 = container.get(PuppeteerTimeoutConfig);
        const obj2 = container.get(PuppeteerTimeoutConfig);
        expect(obj1).toBeDefined();
        expect(obj2).toBeDefined();
        expect(obj1).toEqual(obj2);
    });
});
