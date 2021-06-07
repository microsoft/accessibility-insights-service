// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-request-sender-container';
import { WebApiScanRequestSenderEntryPoint } from './web-api-scan-request-sender-entry-point';

(async () => {
    await new WebApiScanRequestSenderEntryPoint(setupWebApiScanRequestSenderContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
