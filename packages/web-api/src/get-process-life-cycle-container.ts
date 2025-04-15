// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ApplicationInsightsClient, registerAzureServicesToContainer, secretNames, SecretProvider } from 'azure-services';
import { IoC, setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isEmpty } from 'lodash';
import { registerLoggerToContainer } from 'logger';
import { webApiTypeNames } from './web-api-types';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isEmpty(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container({ autoBindInjectable: true });
        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer);

        IoC.setupSingletonProvider<ApplicationInsightsClient>(
            webApiTypeNames.ApplicationInsightsClientProvider,
            processLifeCycleContainer,
            async (context) => {
                const secretProvider = context.container.get(SecretProvider);
                const appInsightsApiKey = await secretProvider.getSecret(secretNames.appInsightsApiKey);

                return new ApplicationInsightsClient(process.env.APPINSIGHTS_APPID, appInsightsApiKey);
            },
        );
    }

    return processLifeCycleContainer;
}
