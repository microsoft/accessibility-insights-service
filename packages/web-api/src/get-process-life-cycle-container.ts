// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CredentialType, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isNil } from 'lodash';
import { registerGlobalLoggerToContainer } from 'logger';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isNil(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container();
        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerGlobalLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer, CredentialType.AppService);
    }

    return processLifeCycleContainer;
}
