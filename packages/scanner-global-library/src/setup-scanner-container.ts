// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as inversify from 'inversify';
import { cloudAxeConfiguration, localAxeConfiguration } from './axe-scanner/axe-configuration';
import { AxePuppeteerFactory } from './axe-scanner/axe-puppeteer-factory';
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
