// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AppContext, getGlobalWebControllerDispatcher, Newable, WebController } from 'service-library';
import { Container } from 'inversify';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function processWebRequest(appContext: AppContext, controllerType: Newable<WebController>, ...args: any[]): Promise<any> {
    const processLifeCycleContainer = getProcessLifeCycleContainer();
    const dispatcher = await getGlobalWebControllerDispatcher(processLifeCycleContainer);

    const container = new Container({ autoBindInjectable: true });
    container.parent = processLifeCycleContainer;

    return dispatcher.processRequest(container, controllerType, appContext, ...args);
}
