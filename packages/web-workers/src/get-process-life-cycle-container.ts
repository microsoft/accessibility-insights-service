// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CredentialType, registerAzureServicesToContainer, SecretProvider } from 'azure-services';
import { IoC, setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger, Logger, loggerTypes, registerContextAwareLoggerToContainer, registerGlobalLoggerToContainer } from 'logger';
import { A11yServiceClient, a11yServiceClientTypeNames, A11yServiceCredential } from 'web-api-client';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isNil(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container({ autoBindInjectable: true });
        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerGlobalLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer, CredentialType.AppService);

        IoC.setupSingletonProvider<A11yServiceClient>(
            a11yServiceClientTypeNames.A11yServiceClientProvider,
            processLifeCycleContainer,
            async context => {
                const secretProvider = context.container.get(SecretProvider);
                const restApiSpAppId = await secretProvider.getSecret('restApiSpAppId');
                const restApiSpSecret = await secretProvider.getSecret('restApiSpSecret');
                const authorityUrl = await secretProvider.getSecret('authorityUrl');
                const logger = context.container.get(GlobalLogger);

                const a11yServiceCredential = new A11yServiceCredential(
                    restApiSpAppId,
                    restApiSpSecret,
                    restApiSpAppId,
                    authorityUrl,
                    logger,
                );

                return new A11yServiceClient(a11yServiceCredential, process.env.WEB_API_BASE_URL);
            },
        );
    }

    return processLifeCycleContainer;
}
