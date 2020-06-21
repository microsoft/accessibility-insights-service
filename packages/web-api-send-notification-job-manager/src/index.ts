// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as util from 'util';
import { SendNotificationJobManagerEntryPoint } from './send-notification-job-manager-entry-point';
import { setupSendNotificationJobManagerContainer } from './setup-send-notification-job-manager-container';

(async () => {
    const sendNotificationJobManagerEntryPoint = new SendNotificationJobManagerEntryPoint(setupSendNotificationJobManagerContainer());
    await sendNotificationJobManagerEntryPoint.start();
    process.exit(0);
})().catch((error) => {
    console.log(util.inspect(error));
    process.exit(1);
});
