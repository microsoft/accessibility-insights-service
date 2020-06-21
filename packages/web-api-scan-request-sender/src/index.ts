// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as util from 'util';
import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-request-sender-container';
import { WebApiScanRequestSenderEntryPoint } from './web-api-scan-request-sender-entry-point';

(async () => {
    await new WebApiScanRequestSenderEntryPoint(setupWebApiScanRequestSenderContainer()).start();
    process.exit(0);
})().catch((error) => {
    console.log(util.inspect(error));
    process.exit(1);
});
