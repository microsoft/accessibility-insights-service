// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';

export function setupHostBrowserServiceContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);

    return container;
}
