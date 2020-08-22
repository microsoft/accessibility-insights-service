// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { System } from 'common';
import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-runner-container';
import { WebApiScanRunnerEntryPoint } from './web-api-scan-runner-entry-point';

(async () => {
    await new WebApiScanRunnerEntryPoint(setupWebApiScanRequestSenderContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
