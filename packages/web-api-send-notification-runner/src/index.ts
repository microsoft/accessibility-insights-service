// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WhyNodeRunningLogger } from 'common';

import { setupWebApiSendNotificationContainer } from './setup-web-api-send-notification-runner-container';
import { WebApiSendNotificationRunnerEntryPoint } from './web-api-send-notification-runner-entry-point';

const whyNodeRunLogger = new WhyNodeRunningLogger();

(async () => {
    await new WebApiSendNotificationRunnerEntryPoint(setupWebApiSendNotificationContainer()).start();
    await whyNodeRunLogger.logAfterSeconds(10);
})().catch(() => {
    process.exit(1);
});
