// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Queue, StorageConfig } from 'azure-services';
import { RetryHelper, ScanRunTimeConfig, ServiceConfiguration } from 'common';
import { cloneDeep } from 'lodash';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import {
    ItemType,
    NotificationError,
    NotificationState,
    OnDemandNotificationRequestMessage,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    ScanCompletedNotification,
} from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { NotificationQueueMessageSender } from './notification-queue-message-sender';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

class MockableLogger extends Logger {}

describe(NotificationQueueMessageSender, () => {
    let dispatcher: NotificationQueueMessageSender;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let queueMock: IMock<Queue>;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let scanConfig: ScanRunTimeConfig;
    let storageConfigStub: StorageConfig;
    let retryHelperMock: IMock<RetryHelper<void>>;

    const notificationSenderMetadata: OnDemandNotificationRequestMessage = {
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
            failedPageRescanIntervalInHours: 3,
            maxScanRetryCount: 4,
            maxSendNotificationRetryCount: 4,
            minLastReferenceSeenInDays: 5,
            pageRescanIntervalInDays: 6,
            accessibilityRuleExclusionList: [],
            scanTimeoutInMin: 1,
        };

        storageConfigStub = {
            notificationQueue: 'test-notification-queue',
        } as StorageConfig;

        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        queueMock = Mock.ofType(Queue);
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('scanConfig'))
            .returns(async () => scanConfig)
            .verifiable(Times.once());
        retryHelperMock = Mock.ofType<RetryHelper<void>>();

        dispatcher = new NotificationQueueMessageSender(
            onDemandPageScanRunResultProviderMock.object,
            serviceConfigMock.object,
            storageConfigStub,
            queueMock.object,
            loggerMock.object,
            retryHelperMock.object,
        );
    });

    it('Enqueue Notification Succeeded', async () => {
        const notification = generateNotification(notificationSenderMetadata.scanNotifyUrl, 'queued', null);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));
        setupRetryHelperMock();

        queueMock
            .setup((qm) => qm.createMessage(storageConfigStub.notificationQueue, notificationSenderMetadata))
            .returns(async () => Promise.resolve(true))
            .verifiable(Times.once());

        await dispatcher.sendNotificationMessage(notificationSenderMetadata);
    });

    it('Send Notification Failed', async () => {
        const notification = generateNotification(notificationSenderMetadata.scanNotifyUrl, 'queueFailed', {
            errorType: 'InternalError',
            message: 'Failed to enqueue the notification',
        });
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));
        setupRetryHelperMock();

        queueMock
            .setup((qm) => qm.createMessage(storageConfigStub.notificationQueue, notificationSenderMetadata))
            .returns(async () => Promise.resolve(false))
            .verifiable(Times.once());

        await dispatcher.sendNotificationMessage(notificationSenderMetadata);
    });

    it('Send Notification Failed Error', async () => {
        const notification = generateNotification(notificationSenderMetadata.scanNotifyUrl, 'queueFailed', {
            errorType: 'InternalError',
            message: 'Failed to enqueue the notification',
        });
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));
        setupRetryHelperMock();

        queueMock.setup((qm) => qm.createMessage(storageConfigStub.notificationQueue, notificationSenderMetadata)).verifiable(Times.once());

        await dispatcher.sendNotificationMessage(notificationSenderMetadata);
    });

    afterEach(() => {
        onDemandPageScanRunResultProviderMock.verifyAll();
        queueMock.verifyAll();
        loggerMock.verifyAll();
        serviceConfigMock.verifyAll();
    });

    function getRunningJobStateScanResult(notification: ScanCompletedNotification): Partial<OnDemandPageScanResult> {
        return {
            id: onDemandPageScanResult.id,
            notification: notification,
        };
    }

    function setupUpdateScanRunResultCall(result: Partial<OnDemandPageScanResult>): void {
        const clonedResult = cloneDeep(result);
        onDemandPageScanRunResultProviderMock
            .setup(async (d) => d.updateScanRun(clonedResult))
            .returns(async () => Promise.resolve(clonedResult as OnDemandPageScanResult))
            .verifiable(Times.once());
    }

    function generateNotification(notificationUrl: string, state: NotificationState, error: NotificationError): ScanCompletedNotification {
        return {
            scanNotifyUrl: notificationUrl,
            state: state,
            error: error,
        };
    }

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup((r) => r.executeWithRetries(It.isAny(), It.isAny(), scanConfig.maxSendNotificationRetryCount, 1000))
            .returns(async (action: () => Promise<void>, errorHandler: (err: Error) => Promise<void>, _: number) => {
                try {
                    await action();
                } catch (error) {
                    await errorHandler(new Error(`Failed to enqueue the notification`));
                }
            })
            .verifiable();
    }
});
