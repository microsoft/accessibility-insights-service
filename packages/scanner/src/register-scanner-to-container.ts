// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as inversify from 'inversify';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';

export function registerScannerToContainer(container: inversify.Container): inversify.Container {
    container.bind<AxePuppeteerFactory>(AxePuppeteerFactory).toSelf().inSingletonScope();

    return container;
}
