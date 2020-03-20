// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Logger } from 'logger';
import { NotificationSenderWebAPIClient } from './notification-sender-web-api-client';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

class MockableLogger extends Logger {}

describe(NotificationSenderWebAPIClient, () => {
    let sender: NotificationSenderWebAPIClient;
});
