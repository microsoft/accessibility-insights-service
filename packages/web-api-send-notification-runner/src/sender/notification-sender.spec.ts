// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
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
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let systemMock: IMock<typeof System>;
    let processStub: typeof process;
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
            failedPageRescanIntervalInHours: 3,
            maxScanRetryCount: 4,
            maxSendNotificationRetryCount: 5,
            minLastReferenceSeenInDays: 5,
            pageRescanIntervalInDays: 6,
            accessibilityRuleExclusionList: [],
            scanTimeoutInMin: 1,
        };
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        webAPIMock = Mock.ofType(NotificationSenderWebAPIClient);
        loggerMock = Mock.ofType(MockableLogger);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async s => s.getConfigValue('scanConfig'))
            .returns(async () => scanConfig)
            .verifiable(Times.once());
        systemMock = Mock.ofInstance(System, MockBehavior.Strict);
        notificationSenderMetadataMock = Mock.ofType(NotificationSenderConfig);
        notificationSenderMetadataMock.setup(s => s.getConfig()).returns(() => notificationSenderMetadata);

        processStub = {} as typeof process;
        processStub.env = { batchJobId: 'job 1' };

        sender = new NotificationSender(
            onDemandPageScanRunResultProviderMock.object,
            webAPIMock.object,
            notificationSenderMetadataMock.object,
            loggerMock.object,
            serviceConfigMock.object,
            processStub,
            systemMock.object,
        );
    });

    it('Send Notification Succeeded', async () => {
        const notification = generateNotification(notificationSenderMetadata.scanNotifyUrl, 'sent', null, 200);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult(notification));

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
            .setup(sm => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount - 1));

        const response = { statusCode: 400, body: 'Bad Request' } as ResponseAsJSON;

        webAPIMock
            .setup(wam => wam.sendNotification(notificationSenderMetadata))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount));

        await sender.sendNotification();
    });

    it('Send Notification Failed Error', async () => {
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
            .setup(sm => sm.wait(5000))
            .returns(async () => Promise.resolve())
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount - 1));

        webAPIMock
            .setup(wam => wam.sendNotification(notificationSenderMetadata))
            .throws(new Error('Unexpected Error'))
            .verifiable(Times.exactly(scanConfig.maxSendNotificationRetryCount));

        await sender.sendNotification();
    });

    afterEach(() => {
        notificationSenderMetadataMock.verifyAll();
        webAPIMock.verifyAll();
        loggerMock.verifyAll();
        serviceConfigMock.verifyAll();
        systemMock.verifyAll();
    });

    function getRunningJobStateScanResult(notification: ScanCompletedNotification): Partial<OnDemandPageScanResult> {
        return {
            id: onDemandPageScanResult.id,
            notification: notification,
        };
    }

    function setupUpdateScanRunResultCall(result: Partial<OnDemandPageScanResult>): void {
        onDemandPageScanRunResultProviderMock
            .setup(async d => d.updateScanRun(result))
            .returns(async () => Promise.resolve(result as OnDemandPageScanResult))
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
