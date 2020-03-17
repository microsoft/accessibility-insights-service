// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { SendNotificationConfig } from '../send-notification-config';
import { ScanMetadata } from '../types/scan-metadata';
import { NotificationSender } from './notification-sender';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

class MockableLogger extends Logger {}

describe(NotificationSender, () => {
    let sender: NotificationSender;
    let scanMetadataConfigMock: IMock<SendNotificationConfig>;
    let loggerMock: IMock<MockableLogger>;
    const scanMetadata: ScanMetadata = {
        id: 'id',
        replyUrl: 'replyUrl',
    };

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        scanMetadataConfigMock = Mock.ofType(SendNotificationConfig);
        scanMetadataConfigMock.setup(s => s.getConfig()).returns(() => scanMetadata);

        sender = new NotificationSender(scanMetadataConfigMock.object, loggerMock.object);
    });

    it('Send Notification', async () => {
        loggerMock.setup(lm => lm.logInfo(`Id: ${scanMetadata.id}`)).verifiable(Times.once());
        loggerMock.setup(lm => lm.logInfo(`Reply URL: ${scanMetadata.replyUrl}`)).verifiable(Times.once());

        await sender.sendNotification();
    });

    afterEach(() => {
        scanMetadataConfigMock.verifyAll();
        loggerMock.verifyAll();
    });
});
