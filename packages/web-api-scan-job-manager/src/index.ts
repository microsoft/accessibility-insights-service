// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { setupWebApiScanJobManagerContainer } from './setup-web-api-scan-job-manager-container';
import { WebApiScanJobManagerEntryPoint } from './web-api-scan-job-manager-entry-point';

(async () => {
    await new WebApiScanJobManagerEntryPoint(setupWebApiScanJobManagerContainer()).start();
})().catch(() => {
    process.exit(1);
});
