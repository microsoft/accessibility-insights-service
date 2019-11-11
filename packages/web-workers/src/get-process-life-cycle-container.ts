// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CredentialType, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isNil } from 'lodash';
import { registerLoggerToContainer } from 'logger';
import { A11yServiceClient } from 'web-api-client';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isNil(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container();
        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer, CredentialType.AppService);
        processLifeCycleContainer
            .bind(A11yServiceClient)
            .toDynamicValue(context => new A11yServiceClient(undefined, process.env.WEB_API_BASE_URL));
    }

    return processLifeCycleContainer;
}
