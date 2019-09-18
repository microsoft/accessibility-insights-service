// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AzureServicesIocTypes, CredentialType, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';

export function setupIoContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container.unbind(AzureServicesIocTypes.CredentialType);
    container.bind(AzureServicesIocTypes.CredentialType).toConstantValue(CredentialType.AppService);

    return container;
}
