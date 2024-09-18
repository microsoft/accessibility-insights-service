// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AppContext, getGlobalWebControllerDispatcher, Newable, WebController } from 'service-library';
import { Container } from 'inversify';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';
import { setupRequestContextIocContainer } from './setup-request-context-ioc-container';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function processWebRequest(appContext: AppContext, controllerType: Newable<WebController>, ...args: any[]): Promise<any> {
    const processLifeCycleContainer = getProcessLifeCycleContainer();
    const requestContainer = getRequestContainer(processLifeCycleContainer);
    const dispatcher = await getGlobalWebControllerDispatcher(processLifeCycleContainer);

    return dispatcher.processRequest(requestContainer, controllerType, appContext, ...args);
}

export function getRequestContainer(container?: Container): Container {
    const processLifeCycleContainer = container ?? getProcessLifeCycleContainer();

    return setupRequestContextIocContainer(processLifeCycleContainer);
}
