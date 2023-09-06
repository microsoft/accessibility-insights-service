// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as inversify from 'inversify';
import { axeScannerIocTypes } from './axe-core-scanner-ioc-types';
import { webAxeRunOptions } from './axe-run-options';
import { localAxeConfiguration } from './axe-configuration';

export function registerAxeCoreScannerToContainer(container: inversify.Container): inversify.Container {
    container.bind(axeScannerIocTypes.AxeConfiguration).toConstantValue(localAxeConfiguration);
    container.bind(axeScannerIocTypes.AxeRunOptions).toConstantValue(webAxeRunOptions);

    return container;
}
