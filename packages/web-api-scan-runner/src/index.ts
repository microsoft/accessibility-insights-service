// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WhyNodeRunningLogger } from 'common';

import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-runner-container';
import { WebApiScanRunnerEntryPoint } from './web-api-scan-runner-entry-point';

const whyNodeRunLogger = new WhyNodeRunningLogger();

(async () => {
    await new WebApiScanRunnerEntryPoint(setupWebApiScanRequestSenderContainer()).start();
    await whyNodeRunLogger.logAfterSeconds(10);
})().catch(() => {
    process.exit(1);
});
