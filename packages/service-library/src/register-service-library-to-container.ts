// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as inversify from 'inversify';
import { WebDriver } from './web-driver/web-driver';

export function registerServiceLibraryToContainer(container: inversify.Container): inversify.Container {
    container.bind<WebDriver>(WebDriver).toSelf().inSingletonScope();

    return container;
}
