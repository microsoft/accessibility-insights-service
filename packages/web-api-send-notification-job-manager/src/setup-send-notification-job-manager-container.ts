// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import { Container } from 'inversify';
import { registerGlobalLoggerToContainer } from 'logger';
import { registerServiceLibraryToContainer } from 'service-library';

export function setupSendNotificationJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerGlobalLoggerToContainer(container);
    registerAzureServicesToContainer(container);
    registerServiceLibraryToContainer(container);

    return container;
}
