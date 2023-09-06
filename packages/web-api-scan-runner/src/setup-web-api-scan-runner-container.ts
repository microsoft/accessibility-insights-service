// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { setupScannerContainer } from 'scanner-global-library';
import { registerReportGeneratorToContainer } from './report-generator/register-report-generator-to-container';

export function setupWebApiScanRunnerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true, skipBaseClassChecks: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);
    setupScannerContainer(container);
    registerReportGeneratorToContainer(container);

    return container;
}
