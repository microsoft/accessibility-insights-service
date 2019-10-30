// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { isNil } from 'lodash';
import { WebControllerDispatcher } from './web-controller-dispatcher';

let globalWebControllerDispatcher: Promise<WebControllerDispatcher>;

export async function getGlobalWebControllerDispatcher(container: Container): Promise<WebControllerDispatcher> {
    if (isNil(globalWebControllerDispatcher)) {
        globalWebControllerDispatcher = createWebDispatcher(container);
    }

    return globalWebControllerDispatcher;
}

async function createWebDispatcher(container: Container): Promise<WebControllerDispatcher> {
    const dispatcher = new WebControllerDispatcher(container);

    await dispatcher.start();

    return dispatcher;
}
