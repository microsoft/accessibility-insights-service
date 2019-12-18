// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CredentialType, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { isNil } from 'lodash';
import { registerContextAwareLoggerToContainer } from 'logger';

let processLifeCycleContainer: inversify.Container;

export function getProcessLifeCycleContainer(): inversify.Container {
    if (isNil(processLifeCycleContainer)) {
        processLifeCycleContainer = new inversify.Container({ autoBindInjectable: true });
        setupRuntimeConfigContainer(processLifeCycleContainer);
        registerContextAwareLoggerToContainer(processLifeCycleContainer);
        registerAzureServicesToContainer(processLifeCycleContainer, CredentialType.AppService);
    }

    return processLifeCycleContainer;
}
