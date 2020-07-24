// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-implicit-dependencies

import 'reflect-metadata';

import { System } from 'common';
import { setupWebApiScanJobManagerContainer } from './setup-web-api-scan-job-manager-container';
import { WebApiScanJobManagerEntryPoint } from './web-api-scan-job-manager-entry-point';

(async () => {
    const webApiJobManagerEntryPoint = new WebApiScanJobManagerEntryPoint(setupWebApiScanJobManagerContainer());
    await webApiJobManagerEntryPoint.start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
