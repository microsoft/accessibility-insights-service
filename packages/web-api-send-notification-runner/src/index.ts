// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as util from 'util';
import { setupWebApiNotificationSenderContainer } from './setup-web-api-notification-sender-container';
import { WebApiNotificationSenderEntryPoint } from './web-api-notification-sender-entry-point';

(async () => {
    await new WebApiNotificationSenderEntryPoint(setupWebApiNotificationSenderContainer()).start();
    process.exit(0);
})().catch((error) => {
    console.log(util.inspect(error));
    process.exit(1);
});
