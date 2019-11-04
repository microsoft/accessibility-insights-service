// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';

export function setupRequestContextIocContainer(processLifeCycleContainer: Container): Container {
    const container = new Container({ autoBindInjectable: true });
    container.parent = processLifeCycleContainer;

    return container;
}
