// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ApplicationInsightsClient, CredentialType, registerAzureServicesToContainer, secretNames, SecretProvider } from 'azure-services';
import { IoC, setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isNil } from 'lodash';
import { registerContextAwareLoggerToContainer } from 'logger';
import { webApiTypeNames } from './web-api-types';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isNil(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container({ autoBindInjectable: true });
        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerContextAwareLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer, CredentialType.AppService);

        IoC.setupSingletonProvider<ApplicationInsightsClient>(
            webApiTypeNames.ApplicationInsightsClientProvider,
            processLifeCycleContainer,
            async context => {
                const secretProvider = processLifeCycleContainer.get(SecretProvider);
                const appInsightsApiKey = await secretProvider.getSecret(secretNames.appInsightsApiKey);

                return new ApplicationInsightsClient(process.env.APPINSIGHTS_APPID, appInsightsApiKey);
            },
        );
    }

    return processLifeCycleContainer;
}
