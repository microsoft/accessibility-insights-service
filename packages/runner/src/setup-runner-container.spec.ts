// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { Runner } from './runner/runner';
import { setupRunnerContainer } from './setup-runner-container';
// tslint:disable: no-any

describe(setupRunnerContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupRunnerContainer();

        expect(container.get(Runner)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupRunnerContainer();

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
