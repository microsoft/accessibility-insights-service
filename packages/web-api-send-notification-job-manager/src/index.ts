// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { SendNotificationJobManagerEntryPoint } from './send-notification-job-manager-entry-point';
import { setupSendNotificationJobManagerContainer } from './setup-send-notification-job-manager-container';

(async () => {
    const sendNotificationJobManagerEntryPoint = new SendNotificationJobManagerEntryPoint(setupSendNotificationJobManagerContainer());
    await sendNotificationJobManagerEntryPoint.start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
