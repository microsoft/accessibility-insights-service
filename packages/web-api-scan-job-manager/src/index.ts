// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as util from 'util';
import { setupWebApiScanJobManagerContainer } from './setup-web-api-scan-job-manager-container';
import { WebApiScanJobManagerEntryPoint } from './web-api-scan-job-manager-entry-point';

(async () => {
    const webApiJobManagerEntryPoint = new WebApiScanJobManagerEntryPoint(setupWebApiScanJobManagerContainer());
    await webApiJobManagerEntryPoint.start();
    process.exit(0);
})().catch((error) => {
    console.log(util.inspect(error));
    process.exit(1);
});
