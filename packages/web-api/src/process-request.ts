// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpResponseInit } from '@azure/functions';
import { AppContext, getGlobalWebControllerDispatcher, Newable, WebController } from 'service-library';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';
import { setupRequestContextIocContainer } from './setup-request-context-ioc-container';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function processWebRequest(
    appContext: AppContext,
    controllerType: Newable<WebController>,
    ...args: any[]
): Promise<HttpResponseInit> {
    const processLifeCycleContainer = getProcessLifeCycleContainer();
    const dispatcher = await getGlobalWebControllerDispatcher(processLifeCycleContainer);
    const requestContainer = setupRequestContextIocContainer(processLifeCycleContainer);

    return dispatcher.processRequest(requestContainer, controllerType, appContext, ...args);
}
