// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { StorageClient } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { Runner } from './runner/runner';
import { setupRunnerContainer } from './setup-runner-container';
// tslint:disable: no-any

describe(setupRunnerContainer, () => {
    it('resolves StorageClient', () => {
        const container = setupRunnerContainer();

        const storageClient = container.get(StorageClient);

        expect((storageClient as any).dbName).toBe('scanner');
        expect((storageClient as any).collectionName).toBe('a11yIssues');
    });

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
