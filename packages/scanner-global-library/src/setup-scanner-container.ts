// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as inversify from 'inversify';
import { cloudAxeConfiguration, localAxeConfiguration } from './factories/axe-configuration';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { iocTypes } from './ioc-types';

export function setupCloudScannerContainer(container: inversify.Container): inversify.Container {
    container.bind(iocTypes.AxeConfiguration).toConstantValue(cloudAxeConfiguration);
    container.bind(AxePuppeteerFactory).toSelf().inSingletonScope();

    return container;
}

export function setupLocalScannerContainer(container: inversify.Container): inversify.Container {
    container.bind(iocTypes.AxeConfiguration).toConstantValue(localAxeConfiguration);

    return container;
}
