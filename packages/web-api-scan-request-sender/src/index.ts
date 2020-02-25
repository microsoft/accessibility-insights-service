// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { WhyNodeRunningLogger } from 'common';

import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-request-sender-container';
import { WebApiScanRequestSenderEntryPoint } from './web-api-scan-request-sender-entry-point';

const whyNodeRunLogger = new WhyNodeRunningLogger();
whyNodeRunLogger.start();

(async () => {
    await new WebApiScanRequestSenderEntryPoint(setupWebApiScanRequestSenderContainer()).start();
    whyNodeRunLogger.stopAfterSeconds(10);
})().catch(() => {
    process.exit(1);
});
