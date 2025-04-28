// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { registerAzureServicesToContainer, SecretProvider } from 'azure-services';
import { IoC, setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isEmpty } from 'lodash';
import { registerLoggerToContainer } from 'logger';
import { A11yServiceClient, a11yServiceClientTypeNames, A11yServiceCredential } from 'web-api-client';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isEmpty(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container({ autoBindInjectable: true });

        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer);

        IoC.setupSingletonProvider<A11yServiceClient>(
            a11yServiceClientTypeNames.A11yServiceClientProvider,
            processLifeCycleContainer,
            async (context) => {
                const secretProvider = context.container.get(SecretProvider);
                const webApiIdentityClientId = await secretProvider.getSecret('webApiIdentityClientId');
                // Client Id is a user-managed identity for REST API function and web worker app
                const a11yServiceCredential = new A11yServiceCredential(webApiIdentityClientId, webApiIdentityClientId);

                // The worker function app has a custom environment variable WEB_API_BASE_URL
                return new A11yServiceClient(a11yServiceCredential, process.env.WEB_API_BASE_URL);
            },
        );
    }

    return processLifeCycleContainer;
}
