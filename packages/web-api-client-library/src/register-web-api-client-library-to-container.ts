// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as inversify from 'inversify';
import { WebApiClient } from './web-api-client';

export function registerWebApiClientLibraryToContainer(container: inversify.Container): inversify.Container {
    container.bind(WebApiClient).toDynamicValue(context => {
        return new WebApiClient(process.env.FunctionAppName);
    });

    return container;
}
