// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { PromiseUtils, System } from 'common';
import { cloneDeep } from 'lodash';
import { Logger } from 'logger';
import { ResponseAsJSON } from 'request';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import {
    ItemType,
    NotificationError,
    NotificationState,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    ScanCompletedNotification,
} from 'storage-documents';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { NotificationSenderConfig } from '../notification-sender-config';
import { NotificationSenderWebAPIClient } from '../tasks/notification-sender-web-api-client';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';
import { NotificationSender } from './notification-sender';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

class MockableLogger extends Logger {}

describe(NotificationSender, () => {
    let sender: NotificationSender;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let webAPIMock: IMock<NotificationSenderWebAPIClient>;
    let notificationSenderMetadataMock: IMock<NotificationSenderConfig>;
    let loggerMock: IMock<MockableLogger>;
    let systemMock: IMock<typeof System>;
    const notificationSenderMetadata: NotificationSenderMetadata = {
        scanId: 'id',
        replyUrl: 'replyUrl',
        runStatus: 'completed',
        scanStatus: 'pass',
    };

    const onDemandPageScanResult: OnDemandPageScanResult = {
        url: 'url',
        scanResult: null,
        reports: null,
        run: {
            state: 'queued' as OnDemandPageScanRunState,
            timestamp: 'timestamp',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
        id: 'id',
        partitionKey: 'item-partitionKey',
        batchRequestId: 'batch-id',
    };

    beforeEach(() => {
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        webAPIMock = Mock.ofType(NotificationSenderWebAPIClient);
        loggerMock = Mock.ofType(MockableLogger);
        systemMock = Mock.ofInstance(System, MockBehavior.Strict);
        notificationSenderMetadataMock = Mock.ofType(NotificationSenderConfig);
        notificationSenderMetadataMock.setup(s => s.getConfig()).returns(() => notificationSenderMetadata);

        sender = new NotificationSender(
            onDemandPageScanRunResultProviderMock.object,
            webAPIMock.object,
            notificationSenderMetadataMock.object,
            loggerMock.object,
            systemMock.object,
        );
    });

    it('Send Notification Succeeded', async () => {
        setupReadScanResultCall(onDemandPageScanResult);
        onDemandPageScanResult.notification = generateNotification(notificationSenderMetadata.replyUrl, 'sent', []);

        setupUpdateScanRunResultCall(onDemandPageScanResult);

        const response = { statusCode: 200 } as ResponseAsJSON;

        systemMock
            .setup(sm => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.never());

        webAPIMock
            .setup(wam => wam.sendNotification(notificationSenderMetadata))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        await sender.sendNotification();
    });

    it('Send Notification Failed', async () => {
        onDemandPageScanResult.notification = undefined;
        setupReadScanResultCall(onDemandPageScanResult);
        onDemandPageScanResult.notification = generateNotification(notificationSenderMetadata.replyUrl, 'sendFailed', [
            { errorType: 'HttpErrorCode', message: 'Bad Request' },
            { errorType: 'HttpErrorCode', message: 'Bad Request' },
            { errorType: 'HttpErrorCode', message: 'Bad Request' },
        ]);

        setupUpdateScanRunResultCall(onDemandPageScanResult);

        systemMock
            .setup(sm => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.exactly(2));

        const response = { statusCode: 400, body: 'Bad Request' } as ResponseAsJSON;

        webAPIMock
            .setup(wam => wam.sendNotification(notificationSenderMetadata))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.exactly(3));

        await sender.sendNotification();
    });

    it('Send Notification Failed Error', async () => {
        onDemandPageScanResult.notification = undefined;
        setupReadScanResultCall(onDemandPageScanResult);
        onDemandPageScanResult.notification = generateNotification(notificationSenderMetadata.replyUrl, 'sendFailed', [
            { errorType: 'HttpErrorCode', message: 'Unexpected Error' },
            { errorType: 'HttpErrorCode', message: 'Unexpected Error' },
            { errorType: 'HttpErrorCode', message: 'Unexpected Error' },
        ]);

        setupUpdateScanRunResultCall(onDemandPageScanResult);

        systemMock
            .setup(sm => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.exactly(2));

        webAPIMock
            .setup(wam => wam.sendNotification(notificationSenderMetadata))
            .throws(new Error('Unexpected Error'))
            .verifiable(Times.exactly(3));

        await sender.sendNotification();
    });

    afterEach(() => {
        notificationSenderMetadataMock.verifyAll();
        webAPIMock.verifyAll();
        loggerMock.verifyAll();
        systemMock.verifyAll();
    });

    function setupReadScanResultCall(scanResult: any): void {
        onDemandPageScanRunResultProviderMock
            .setup(async d => d.readScanRun(notificationSenderMetadata.scanId))
            .returns(async () => Promise.resolve(cloneDeep(scanResult)))
            .verifiable(Times.once());
    }

    function setupUpdateScanRunResultCall(result: OnDemandPageScanResult): void {
        onDemandPageScanRunResultProviderMock
            .setup(async d => d.updateScanRun(result))
            .returns(async () => Promise.resolve(result))
            .verifiable(Times.once());
    }

    function generateNotification(
        notificationUrl: string,
        state: NotificationState,
        errors: NotificationError[],
    ): ScanCompletedNotification {
        return {
            notificationUrl: notificationUrl,
            state: state,
            errors: errors,
        };
    }
});
