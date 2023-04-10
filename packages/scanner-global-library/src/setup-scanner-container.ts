// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as inversify from 'inversify';
import { cloudAxeConfiguration, localAxeConfiguration } from './axe-scanner/axe-configuration';
import { webAxeRunOptions } from './axe-scanner/axe-run-options';
import { AxePuppeteerFactory } from './axe-scanner/axe-puppeteer-factory';
import { iocTypes } from './ioc-types';

export function setupCloudScannerContainer(container: inversify.Container): inversify.Container {
    container.options.skipBaseClassChecks = true;
    container.bind(iocTypes.AxeConfiguration).toConstantValue(cloudAxeConfiguration);
    container.bind(iocTypes.AxeRunOptions).toConstantValue(webAxeRunOptions);
    container.bind(AxePuppeteerFactory).toSelf().inSingletonScope();

    return container;
}

export function setupLocalScannerContainer(container: inversify.Container): inversify.Container {
    container.options.skipBaseClassChecks = true;
    container.bind(iocTypes.AxeConfiguration).toConstantValue(localAxeConfiguration);
    container.bind(iocTypes.AxeRunOptions).toConstantValue(webAxeRunOptions);
    container.bind(iocTypes.SecretVaultProvider).toFunction(() => Promise.resolve({ webScannerBypassKey: '1.0' }));

    return container;
}
