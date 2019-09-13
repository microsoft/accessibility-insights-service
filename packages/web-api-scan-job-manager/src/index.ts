// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { setupWebApiScanJobManagerContainer } from './setup-web-api-scan-job-manager-container';
import { WebApiScanJobManagerEntryPoint } from './web-api-scan-job-manager-entry-point';

(async () => {
    const webApiJobManagerEntryPoint = new WebApiScanJobManagerEntryPoint(setupWebApiScanJobManagerContainer());
    await webApiJobManagerEntryPoint.start();
})().catch(error => {
    console.log('Exception thrown in web api job manager: ', error);
    process.exit(1);
});
