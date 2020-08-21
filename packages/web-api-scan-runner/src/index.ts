// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

// tslint:disable-next-line: no-var-requires no-require-imports no-unsafe-any
require = require('esm')(module); // support ES6 module syntax for Office Fabric package

import { System } from 'common';
import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-runner-container';
import { WebApiScanRunnerEntryPoint } from './web-api-scan-runner-entry-point';

(async () => {
    await new WebApiScanRunnerEntryPoint(setupWebApiScanRequestSenderContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
