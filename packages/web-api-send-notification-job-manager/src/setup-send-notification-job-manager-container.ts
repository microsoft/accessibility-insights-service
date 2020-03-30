// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchTaskPropertyProvider, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import { Container } from 'inversify';
import { registerContextAwareLoggerToContainer, registerGlobalLoggerToContainer } from 'logger';
import { SendNotificationTaskPropertyProvider } from './task/send-notification-task-property-provider';

export function setupSendNotificationJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerGlobalLoggerToContainer(container);
    registerContextAwareLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container
        .bind(BatchTaskPropertyProvider)
        .to(SendNotificationTaskPropertyProvider)
        .inSingletonScope();

    return container;
}
