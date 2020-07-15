// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { System } from 'common';
import { setupWebApiNotificationSenderContainer } from './setup-web-api-notification-sender-container';
import { WebApiNotificationSenderEntryPoint } from './web-api-notification-sender-entry-point';

(async () => {
    await new WebApiNotificationSenderEntryPoint(setupWebApiNotificationSenderContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
