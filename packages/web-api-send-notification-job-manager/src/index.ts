// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WhyNodeRunningLogger } from 'common';

import { SendNotificationJobManagerEntryPoint } from './send-notification-job-manager-entry-point';
import { setupSendNotificationJobManagerContainer } from './setup-send-notification-job-manager-container';

const whyNodeRunLogger = new WhyNodeRunningLogger();

(async () => {
    const sendNotificationJobManagerEntryPoint = new SendNotificationJobManagerEntryPoint(setupSendNotificationJobManagerContainer());
    await sendNotificationJobManagerEntryPoint.start();
    await whyNodeRunLogger.logAfterSeconds(2);
})().catch((error) => {
    console.log('Exception thrown in send notification job manager: ', error);
    process.exit(1);
});
