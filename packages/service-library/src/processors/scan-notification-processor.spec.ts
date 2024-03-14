// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { ServiceConfiguration, FeatureFlags, ScanRunTimeConfig } from 'common';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanResult, WebsiteScanData, OnDemandNotificationRequestMessage, WebsiteScanRef } from 'storage-documents';
import { ScanNotificationProcessor } from './scan-notification-processor';
import { ScanNotificationDispatcher } from './scan-notification-dispatcher';

let serviceConfigMock: IMock<ServiceConfiguration>;
let notificationQueueMessageSenderMock: IMock<ScanNotificationDispatcher>;
let loggerMock: IMock<GlobalLogger>;
let scanNotificationProcessor: ScanNotificationProcessor;
let featureFlagsConfig: FeatureFlags;
let scanConfig: ScanRunTimeConfig;
let pageScanResult: OnDemandPageScanResult;
let websiteScanData: WebsiteScanData;

describe(ScanNotificationProcessor, () => {
    beforeEach(() => {
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        notificationQueueMessageSenderMock = Mock.ofType(ScanNotificationDispatcher);
        loggerMock = Mock.ofType<GlobalLogger>();

        featureFlagsConfig = {
            sendNotification: true,
        };
        scanConfig = {
            maxFailedScanRetryCount: 1,
        } as ScanRunTimeConfig;
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('featureFlags'))
            .returns(async () => featureFlagsConfig)
            .verifiable();
        serviceConfigMock.setup(async (s) => s.getConfigValue('scanConfig')).returns(async () => scanConfig);
        websiteScanData = {
            id: 'websiteScanResultId',
            deepScanId: 'deepScanId',
        } as WebsiteScanData;
        pageScanResult = {
            id: 'pageScanResultId',
            notification: {
                scanNotifyUrl: 'scanNotifyUrl',
            },
            run: {
                state: 'completed',
            },
            scanResult: {
                state: 'pass',
            },
        } as OnDemandPageScanResult;
        scanNotificationProcessor = new ScanNotificationProcessor(
            serviceConfigMock.object,
            notificationQueueMessageSenderMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        serviceConfigMock.verifyAll();
        notificationQueueMessageSenderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('send scan notification', async () => {
        pageScanResult.websiteScanRef = {
            scanGroupType: 'single-scan',
        } as WebsiteScanRef;
        setupLoggerForSingleScan();
        setupNotificationQueueMessageSender();
        await scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
    });

    it('send scan notification for a failed scan', async () => {
        pageScanResult = {
            id: 'pageScanResultId',
            websiteScanRef: {
                scanGroupType: 'single-scan',
            },
            notification: {
                scanNotifyUrl: 'scanNotifyUrl',
            },
            run: {
                state: 'failed',
                retryCount: 1,
            },
        } as OnDemandPageScanResult;
        setupLoggerForSingleScan();
        setupNotificationQueueMessageSender();
        await scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
    });

    it('skip notification if feature flag is disabled', async () => {
        featureFlagsConfig.sendNotification = false;
        loggerMock.setup((o) => o.logInfo('The scan result notification is disabled.', { sendNotificationFlag: 'false' })).verifiable();
        await scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
    });

    it('skip notification if notification URL is not defined', async () => {
        loggerMock
            .setup((o) => o.logInfo(`Scan result notification URL was not provided. Skip sending scan result notification.`))
            .verifiable();
        pageScanResult.notification = undefined;
        await scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
    });

    it('skip notification if combined scan is not completed', async () => {
        websiteScanData.knownPages = [
            {
                url: 'url1',
                runState: 'completed',
            },
            {
                url: 'url2',
                runState: 'failed',
            },
            {
                url: 'url3',
            },
        ];
        await scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
    });

    it('send scan notification for combined scan', async () => {
        websiteScanData.knownPages = [
            {
                url: 'url1',
                runState: 'completed',
            },
            {
                url: 'url2',
                runState: 'failed',
            },
            {
                url: 'url3',
                runState: 'unscannable',
            },
        ];
        setupLoggerForCombinedScan();
        setupNotificationQueueMessageSender();
        await scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
    });
});

function setupLoggerForCombinedScan(): void {
    loggerMock
        .setup((o) =>
            o.logInfo('Sending scan notification message.', {
                deepScanId: websiteScanData?.deepScanId,
                pageCount: `${websiteScanData.knownPages?.length}`,
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            }),
        )
        .verifiable();
}

function setupLoggerForSingleScan(): void {
    loggerMock
        .setup((o) =>
            o.logInfo('Sending scan notification message.', {
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            }),
        )
        .verifiable();
}

function setupNotificationQueueMessageSender(): void {
    const notificationRequestMessage = {
        scanId: pageScanResult.id,
        scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
        runStatus: pageScanResult.run.state,
        scanStatus: pageScanResult.scanResult?.state,
        deepScanId: websiteScanData.deepScanId,
    } as OnDemandNotificationRequestMessage;
    notificationQueueMessageSenderMock.setup((o) => o.sendNotificationMessage(notificationRequestMessage)).verifiable();
}
