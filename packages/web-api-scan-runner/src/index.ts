// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WhyNodeRunningLogger } from 'common';

import { setupWebApiScanRequestSenderContainer } from './setup-web-api-scan-runner-container';
import { WebApiScanRunnerEntryPoint } from './web-api-scan-runner-entry-point';

const whyNodeRunLogger = new WhyNodeRunningLogger();
whyNodeRunLogger.start();

(async () => {
    await new WebApiScanRunnerEntryPoint(setupWebApiScanRequestSenderContainer()).start();
    whyNodeRunLogger.stopAfterSeconds(10);
})().catch(() => {
    whyNodeRunLogger.stopAfterSeconds(10);
    process.exit(1);
});
