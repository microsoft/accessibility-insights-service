// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WhyNodeRunningLogger } from 'common';

import { setupWebApiScanJobManagerContainer } from './setup-web-api-scan-job-manager-container';
import { WebApiScanJobManagerEntryPoint } from './web-api-scan-job-manager-entry-point';

const whyNodeRunLogger = new WhyNodeRunningLogger();
whyNodeRunLogger.start();

(async () => {
    const webApiJobManagerEntryPoint = new WebApiScanJobManagerEntryPoint(setupWebApiScanJobManagerContainer());
    await webApiJobManagerEntryPoint.start();
    whyNodeRunLogger.stopAfterSeconds(10);
})().catch(error => {
    console.log('Exception thrown in web api job manager: ', error);
    whyNodeRunLogger.stopAfterSeconds(10);
    process.exit(1);
});
