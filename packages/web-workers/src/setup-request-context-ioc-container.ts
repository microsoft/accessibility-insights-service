// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { registerContextAwareLoggerToContainer } from 'logger';

export function setupRequestContextIocContainer(
    processLifeCycleContainer: Container,
    registerLoggerToContainerFunc: (container: Container) => void = registerContextAwareLoggerToContainer,
): Container {
    const container = new Container({ autoBindInjectable: true });
    container.parent = processLifeCycleContainer;
    registerLoggerToContainerFunc(container);

    return container;
}
