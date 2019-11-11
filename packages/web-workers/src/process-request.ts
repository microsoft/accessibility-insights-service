// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';
import { getGlobalWebControllerDispatcher, Newable, WebController } from 'service-library';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';
import { setupRequestContextIocContainer } from './setup-request-context-ioc-container';

export async function processWebRequest(context: Context, controllerType: Newable<WebController>, ...args: unknown[]): Promise<unknown> {
    const processLifeCycleContainer = getProcessLifeCycleContainer();

    const dispatcher = await getGlobalWebControllerDispatcher(processLifeCycleContainer);

    const requestContainer = setupRequestContextIocContainer(processLifeCycleContainer);

    return dispatcher.processRequest(requestContainer, controllerType, context, ...args);
}
