// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { AxePuppeteerFactory, axeScannerIocTypes } from 'axe-core-scanner';
import { setupScannerContainer } from './setup-scanner-container';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(setupScannerContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        setupScannerContainer(container);
    });

    it('should register AxePuppeteerFactory as a singleton', () => {
        verifySingletonResolution(AxePuppeteerFactory);
    });

    it('should use cloudAxeConfiguration', () => {
        expect(container.get(axeScannerIocTypes.AxeConfiguration)).toBeDefined();
    });

    it('should use webAxeRunOptions', () => {
        expect(container.get(axeScannerIocTypes.AxeRunOptions)).toBeDefined();
    });

    function verifySingletonResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toEqual(container.get(key));
    }
});
