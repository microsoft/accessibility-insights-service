// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WhyNodeRunningLogger } from 'common';

import { setupWebApiNotificationSenderContainer } from './setup-web-api-notification-sender-container';
import { WebApiNotificationSenderEntryPoint } from './web-api-notification-sender-entry-point';

const whyNodeRunLogger = new WhyNodeRunningLogger();

(async () => {
    await new WebApiNotificationSenderEntryPoint(setupWebApiNotificationSenderContainer()).start();
    await whyNodeRunLogger.logAfterSeconds(2);
})().catch(() => {
    process.exit(1);
});
