// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { registerContextAwareLoggerToContainer } from 'logger';

export function setupRequestContextIocContainer(processLifeCycleContainer: Container): Container {
    const container = new Container({ autoBindInjectable: true });
    container.parent = processLifeCycleContainer;

    registerContextAwareLoggerToContainer(container);

    return container;
}
