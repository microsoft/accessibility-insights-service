// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ApplicationInsightsClient, registerAzureServicesToContainer, CredentialsProvider } from 'azure-services';
import { IoC, setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isNil } from 'lodash';
import { registerLoggerToContainer } from 'logger';
import { webApiTypeNames } from './web-api-types';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isNil(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container({ autoBindInjectable: true });
        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer);

        IoC.setupSingletonProvider<ApplicationInsightsClient>(
            webApiTypeNames.ApplicationInsightsClientProvider,
            processLifeCycleContainer,
            async (context) => {
                const credentialProvider = context.container.get(CredentialsProvider);
                // const appInsightsApiKey = await secretProvider.getSecret(secretNames.appInsightsApiKey);
                const credential = credentialProvider.getAzureCredential();

                return new ApplicationInsightsClient(process.env.APPINSIGHTS_APPID, credential);
            },
        );
    }

    return processLifeCycleContainer;
}
