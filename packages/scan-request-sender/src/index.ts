// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ScanRequestEntryPoint } from './scan-request-entry-point';
import { setupScanRequestSenderContainer } from './setup-scan-request-sender-container';

(async () => {
    await new ScanRequestEntryPoint(setupScanRequestSenderContainer()).start();
})().catch(() => {
    process.exit(1);
});
