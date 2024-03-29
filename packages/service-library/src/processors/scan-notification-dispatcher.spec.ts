// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Queue, StorageConfig } from 'azure-services';
import { RetryHelper, ScanRunTimeConfig, ServiceConfiguration } from 'common';
import { cloneDeep } from 'lodash';
import { Logger } from 'logger';
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
import { OnDemandPageScanRunResultProvider } from '../data-providers/on-demand-page-scan-run-result-provider';
import { ScanNotificationDispatcher } from './scan-notification-dispatcher';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

class MockableLogger extends Logger {}

describe(ScanNotificationDispatcher, () => {
    let notificationMessageDispatcher: ScanNotificationDispatcher;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let queueMock: IMock<Queue>;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let scanConfig: ScanRunTimeConfig;
    let storageConfigStub: StorageConfig;
    let retryHelperMock: IMock<RetryHelper<void>>;
    let notificationRequestMessage: OnDemandNotificationRequestMessage;

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
        id: 'scanId',
        partitionKey: 'item-partitionKey',
        batchRequestId: 'batch-id',
    };

    beforeEach(() => {
        notificationRequestMessage = {
            scanId: 'scanId',
            scanNotifyUrl: 'scanNotifyUrl',
            runStatus: 'completed',
            scanStatus: 'pass',
        };
        onDemandPageScanResult.id = notificationRequestMessage.scanId;

        scanConfig = {
            maxSendNotificationRetryCount: 4,
        } as ScanRunTimeConfig;

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

        notificationMessageDispatcher = new ScanNotificationDispatcher(
            onDemandPageScanRunResultProviderMock.object,
            serviceConfigMock.object,
            storageConfigStub,
            queueMock.object,
            loggerMock.object,
            retryHelperMock.object,
        );
    });

    afterEach(() => {
        onDemandPageScanRunResultProviderMock.verifyAll();
        queueMock.verifyAll();
        loggerMock.verifyAll();
        serviceConfigMock.verifyAll();
    });

    it('Enqueue Notification Succeeded', async () => {
        const notification = generateNotification(notificationRequestMessage.scanNotifyUrl, 'queued', null);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));
        setupRetryHelperMock();

        queueMock
            .setup((qm) => qm.createMessage(storageConfigStub.notificationQueue, notificationRequestMessage))
            .returns(async () => Promise.resolve(true))
            .verifiable(Times.once());

        await notificationMessageDispatcher.sendNotificationMessage(notificationRequestMessage);
    });

    it('Enqueue notification for deep scan', async () => {
        notificationRequestMessage.deepScanId = 'deepScanId';
        onDemandPageScanResult.id = notificationRequestMessage.deepScanId;

        const notification = generateNotification(notificationRequestMessage.scanNotifyUrl, 'queued', null);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));
        setupRetryHelperMock();

        const { deepScanId, ...queueMessage } = notificationRequestMessage;
        queueMessage.scanId = notificationRequestMessage.deepScanId;
        queueMock
            .setup((qm) => qm.createMessage(storageConfigStub.notificationQueue, queueMessage))
            .returns(async () => Promise.resolve(true))
            .verifiable(Times.once());

        await notificationMessageDispatcher.sendNotificationMessage(notificationRequestMessage);
    });

    it('Send Notification Failed', async () => {
        const notification = generateNotification(notificationRequestMessage.scanNotifyUrl, 'queueFailed', {
            errorType: 'InternalError',
            message: 'Failed to enqueue the notification',
        });
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));
        setupRetryHelperMock();

        queueMock
            .setup((qm) => qm.createMessage(storageConfigStub.notificationQueue, notificationRequestMessage))
            .returns(async () => Promise.resolve(false))
            .verifiable(Times.once());

        await notificationMessageDispatcher.sendNotificationMessage(notificationRequestMessage);
    });

    it('Send Notification Failed Error', async () => {
        const notification = generateNotification(notificationRequestMessage.scanNotifyUrl, 'queueFailed', {
            errorType: 'InternalError',
            message: 'Failed to enqueue the notification',
        });
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));
        setupRetryHelperMock();

        queueMock.setup((qm) => qm.createMessage(storageConfigStub.notificationQueue, notificationRequestMessage)).verifiable(Times.once());

        await notificationMessageDispatcher.sendNotificationMessage(notificationRequestMessage);
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
            .setup(async (d) => d.updateScanRun(It.isValue(clonedResult)))
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
