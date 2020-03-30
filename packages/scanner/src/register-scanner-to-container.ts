// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as inversify from 'inversify';
import { Browser } from 'puppeteer';
import { WebDriver } from 'service-library';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';

export function registerScannerToContainer(container: inversify.Container): inversify.Container {
    container
        .bind<AxePuppeteerFactory>(AxePuppeteerFactory)
        .toSelf()
        .inSingletonScope();

    container.bind<inversify.interfaces.Factory<Browser>>('Factory<Browser>').toFactory<Browser>(context => {
        return () => {
            return context.container.get<WebDriver>(WebDriver).browser;
        };
    });

    return container;
}
