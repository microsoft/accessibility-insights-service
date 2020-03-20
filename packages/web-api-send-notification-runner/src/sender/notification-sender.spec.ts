// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { NotificationSenderConfig } from '../notification-sender-config';
import { NotificationSenderWebAPIClient } from '../tasks/notification-sender-web-api-client';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';
import { NotificationSender } from './notification-sender';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

class MockableLogger extends Logger {}

describe(NotificationSender, () => {
    let sender: NotificationSender;
    let webAPIMock: IMock<NotificationSenderWebAPIClient>;
    let notificationSenderMetadataMock: IMock<NotificationSenderConfig>;
    let loggerMock: IMock<MockableLogger>;
    const notificationSenderMetadata: NotificationSenderMetadata = {
        id: 'id',
        replyUrl: 'replyUrl',
        scanStatus: 'pass',
    };

    beforeEach(() => {
        webAPIMock = Mock.ofType(NotificationSenderWebAPIClient);
        loggerMock = Mock.ofType(MockableLogger);
        notificationSenderMetadataMock = Mock.ofType(NotificationSenderConfig);
        notificationSenderMetadataMock.setup(s => s.getConfig()).returns(() => notificationSenderMetadata);

        // sender = new NotificationSender(webAPIMock.object, notificationSenderMetadataMock.object, loggerMock.object);
    });

    it('Send Notification', async () => {
        loggerMock.setup(lm => lm.logInfo(`Id: ${notificationSenderMetadata.id}`)).verifiable(Times.once());
        loggerMock.setup(lm => lm.logInfo(`Reply URL: ${notificationSenderMetadata.replyUrl}`)).verifiable(Times.once());
        loggerMock.setup(lm => lm.logInfo(`Scan Status: ${notificationSenderMetadata.scanStatus}`)).verifiable(Times.once());

        await sender.sendNotification();
    });

    afterEach(() => {
        notificationSenderMetadataMock.verifyAll();
        loggerMock.verifyAll();
    });
});
