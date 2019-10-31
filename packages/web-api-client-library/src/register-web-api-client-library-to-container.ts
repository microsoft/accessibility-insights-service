// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as inversify from 'inversify';
import { A11yServiceClient } from './a11y-service-client';

export function registerWebApiClientLibraryToContainer(container: inversify.Container): inversify.Container {
    container.bind(A11yServiceClient).toDynamicValue(context => {
        return new A11yServiceClient(process.env.FunctionAppName);
    });

    return container;
}
