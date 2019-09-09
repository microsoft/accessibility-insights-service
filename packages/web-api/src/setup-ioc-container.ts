// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';

// tslint:disable: no-unsafe-any no-any

export type Newable<T> = new (...args: any[]) => T;

export const webApiIocTypes = {
    azureFunctionContext: 'azureFunctionContext',
};

export function setupIoContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    return container;
}
