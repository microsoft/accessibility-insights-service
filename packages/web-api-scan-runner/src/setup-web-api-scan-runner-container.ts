// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerContextAwareLoggerToContainer, registerGlobalLoggerToContainer } from 'logger';
import { registerScannerToContainer } from 'scanner';
import { registerReportGeneratorToContainer } from './report-generator/register-report-generator-to-container';

export function setupWebApiScanRequestSenderContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerGlobalLoggerToContainer(container);
    registerContextAwareLoggerToContainer(container);
    registerAzureServicesToContainer(container);
    registerScannerToContainer(container);
    registerReportGeneratorToContainer(container);

    return container;
}
