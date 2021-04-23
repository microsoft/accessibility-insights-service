// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { client } from 'azure-services';
import { ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { Logger } from 'logger';
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
import { Response } from 'got';
import { NotificationSenderConfig } from '../notification-sender-config';
import { NotificationSenderWebAPIClient } from '../tasks/notification-sender-web-api-client';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';
import { NotificationSender } from './notification-sender';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

class MockableLogger extends Logger {}

describe(NotificationSender, () => {
    let sender: NotificationSender;
    let clientMock: IMock<typeof client>;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let webAPIMock: IMock<NotificationSenderWebAPIClient>;
    let notificationSenderMetadataMock: IMock<NotificationSenderConfig>;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let systemMock: IMock<typeof System>;
    let scanConfig: ScanRunTimeConfig;

    const notificationSenderMetadata: NotificationSenderMetadata = {
        scanId: 'id',
        scanNotifyUrl: 'scanNotifyUrl',
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
        scanConfig = {
            maxSendNotificationRetryCount: 5,
        } as ScanRunTimeConfig;
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        webAPIMock = Mock.ofType(NotificationSenderWebAPIClient);
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('scanConfig'))
            .returns(async () => scanConfig)
            .verifiable(Times.once());
        systemMock = Mock.ofInstance(System, MockBehavior.Strict);
        clientMock = Mock.ofInstance(client);
        notificationSenderMetadataMock = Mock.ofType(NotificationSenderConfig);
        notificationSenderMetadataMock.setup((s) => s.getConfig()).returns(() => notificationSenderMetadata);

        sender = new NotificationSender(
            onDemandPageScanRunResultProviderMock.object,
            webAPIMock.object,
            notificationSenderMetadataMock.object,
            loggerMock.object,
            serviceConfigMock.object,
            systemMock.object,
            clientMock.object,
        );
    });

    it('Task run skipped', async () => {
        setupTryUpdateScanRunResultCall(false);
        serviceConfigMock.reset();
        loggerMock
            .setup((o) =>
                o.logInfo(
                    `Update page scan notification state to 'sending' failed due to merge conflict with other process. Exiting page scan notification task.`,
                ),
            )
            .verifiable();

        await sender.sendNotification();

        loggerMock.verifyAll();
    });

    it('Send Notification Succeeded', async () => {
        setupTryUpdateScanRunResultCall();
        const notification = generateNotification(notificationSenderMetadata.scanNotifyUrl, 'sent', null, 200);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));

        const response = { statusCode: 200 } as Response;

        clientMock
            .setup((c) => c.isSuccessStatusCode(response))
            .returns(() => true)
            .verifiable(Times.once());
        systemMock
            .setup((sm) => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.never());

        webAPIMock
            .setup((wam) => wam.sendNotification(notificationSenderMetadata))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationStarted', undefined, { scanRequestNotificationsStarted: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationCompleted', undefined, { scanRequestNotificationsCompleted: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationFailed', undefined, { scanRequestNotificationsFailed: 1 }))
            .verifiable(Times.never());

        loggerMock.setup((lm) => lm.trackEvent('SendNotificationTaskStarted', undefined, { startedScanNotificationTasks: 1 })).verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('SendNotificationTaskCompleted', undefined, { completedScanNotificationTasks: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('SendNotificationTaskFailed', undefined, { failedScanNotificationTasks: 1 }))
            .verifiable(Times.never());

        await sender.sendNotification();

        loggerMock.verifyAll();
    });

    it('Send Notification HTTP Request Error', async () => {
        setupTryUpdateScanRunResultCall();
        const notification = generateNotification(
            notificationSenderMetadata.scanNotifyUrl,
            'sendFailed',
            {
                errorType: 'HttpErrorCode',
                message: 'Bad Request',
            },
            400,
        );
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));

        systemMock
            .setup((sm) => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount - 1));

        const response = { statusCode: 400, body: 'Bad Request' } as Response;

        webAPIMock
            .setup((wam) => wam.sendNotification(notificationSenderMetadata))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount));
        clientMock
            .setup((c) => c.isSuccessStatusCode(response))
            .returns(() => false)
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount));

        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationStarted', undefined, { scanRequestNotificationsStarted: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationCompleted', undefined, { scanRequestNotificationsCompleted: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationFailed', undefined, { scanRequestNotificationsFailed: 1 }))
            .verifiable();

        loggerMock.setup((lm) => lm.trackEvent('SendNotificationTaskStarted', undefined, { startedScanNotificationTasks: 1 })).verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('SendNotificationTaskCompleted', undefined, { completedScanNotificationTasks: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('SendNotificationTaskFailed', undefined, { failedScanNotificationTasks: 1 }))
            .verifiable(Times.never());

        await sender.sendNotification();

        loggerMock.verifyAll();
    });

    it('Send Notification Run Error', async () => {
        setupTryUpdateScanRunResultCall();
        const notification = generateNotification(
            notificationSenderMetadata.scanNotifyUrl,
            'sendFailed',
            {
                errorType: 'InternalError',
                message: 'Unexpected Error',
            },
            undefined,
        );
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));

        systemMock
            .setup((sm) => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount - 1));

        webAPIMock
            .setup((wam) => wam.sendNotification(notificationSenderMetadata))
            .throws(new Error('Unexpected Error'))
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount));

        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationStarted', undefined, { scanRequestNotificationsStarted: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationCompleted', undefined, { scanRequestNotificationsCompleted: 1 }))
            .verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestNotificationFailed', undefined, { scanRequestNotificationsFailed: 1 }))
            .verifiable();

        loggerMock.setup((lm) => lm.trackEvent('SendNotificationTaskStarted', undefined, { startedScanNotificationTasks: 1 })).verifiable();
        loggerMock
            .setup((lm) => lm.trackEvent('SendNotificationTaskCompleted', undefined, { completedScanNotificationTasks: 1 }))
            .verifiable();
        loggerMock.setup((lm) => lm.trackEvent('SendNotificationTaskFailed', undefined, { failedScanNotificationTasks: 1 })).verifiable();

        await sender.sendNotification();
    });

    afterEach(() => {
        notificationSenderMetadataMock.verifyAll();
        webAPIMock.verifyAll();
        loggerMock.verifyAll();
        serviceConfigMock.verifyAll();
        systemMock.verifyAll();
        clientMock.verifyAll();
    });

    function getRunningJobStateScanResult(notification: ScanCompletedNotification): Partial<OnDemandPageScanResult> {
        return {
            id: onDemandPageScanResult.id,
            notification: notification,
        };
    }

    function setupUpdateScanRunResultCall(result: Partial<OnDemandPageScanResult>): void {
        onDemandPageScanRunResultProviderMock
            .setup(async (d) => d.updateScanRun(result))
            .returns(async () => Promise.resolve(result as OnDemandPageScanResult))
            .verifiable(Times.once());
    }

    function setupTryUpdateScanRunResultCall(succeeded: boolean = true): void {
        const result = {
            id: notificationSenderMetadata.scanId,
            notification: {
                scanNotifyUrl: notificationSenderMetadata.scanNotifyUrl,
                state: 'sending',
            },
        } as OnDemandPageScanResult;
        onDemandPageScanRunResultProviderMock
            .setup(async (d) => d.tryUpdateScanRun(result))
            .returns(async () => Promise.resolve({ succeeded, result }))
            .verifiable(Times.once());
    }

    function generateNotification(
        notificationUrl: string,
        state: NotificationState,
        error: NotificationError,
        statusCode: number,
    ): ScanCompletedNotification {
        return {
            scanNotifyUrl: notificationUrl,
            state: state,
            error: error,
            responseCode: statusCode,
        };
    }
});
