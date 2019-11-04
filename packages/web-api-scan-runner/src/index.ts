// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-runner-container';
import { WebApiScanRunnerEntryPoint } from './web-api-scan-runner-entry-point';

(async () => {
    await new WebApiScanRunnerEntryPoint(setupWebApiScanRequestSenderContainer()).start();
})().catch(() => {
    process.exit(1);
});
