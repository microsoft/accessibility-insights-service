// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as inversify from 'inversify';
import { PuppeteerTimeoutConfig } from './page-timeout-config';

export function setupScannerContainer(container: inversify.Container): inversify.Container {
    container.options.skipBaseClassChecks = true;
    container.bind(PuppeteerTimeoutConfig).toSelf().inSingletonScope();

    return container;
}
