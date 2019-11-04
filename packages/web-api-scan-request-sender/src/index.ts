// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-request-sender-container';
import { WebApiScanRequestSenderEntryPoint } from './web-api-scan-request-sender-entry-point';

(async () => {
    await new WebApiScanRequestSenderEntryPoint(setupWebApiScanRequestSenderContainer()).start();
})().catch(() => {
    process.exit(1);
});
