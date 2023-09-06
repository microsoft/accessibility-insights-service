// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as inversify from 'inversify';
import { registerAxeCoreScannerToContainer } from 'axe-core-scanner';

export function setupScannerContainer(container: inversify.Container): inversify.Container {
    container.options.skipBaseClassChecks = true;
    registerAxeCoreScannerToContainer(container);

    return container;
}
