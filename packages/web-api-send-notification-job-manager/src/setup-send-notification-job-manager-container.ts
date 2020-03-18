// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AzureServicesIocTypes, BatchTaskParameterProvider, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import { Container } from 'inversify';
import { registerGlobalLoggerToContainer } from 'logger';

export function setupSendNotificationJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerGlobalLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    return container;
}
