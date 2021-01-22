// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { setupCloudCrawlerContainer } from 'accessibility-insights-crawler';
import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { registerScannerToContainer } from 'scanner-global-library';
import { registerReportGeneratorToContainer } from './report-generator/register-report-generator-to-container';

export function setupWebApiScanRunnerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);
    registerScannerToContainer(container);
    registerReportGeneratorToContainer(container);
    setupCloudCrawlerContainer(container);

    return container;
}
