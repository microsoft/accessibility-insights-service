// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { ServiceConfiguration, FeatureFlags, ScanRunTimeConfig } from 'common';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanResult, WebsiteScanResult, PageScan, OnDemandNotificationRequestMessage } from 'storage-documents';
import { ScanMetadata } from '../types/scan-metadata';
import { ScanNotificationProcessor } from './scan-notification-processor';
import { NotificationMessageDispatcher } from './notification-message-dispatcher';

let serviceConfigMock: IMock<ServiceConfiguration>;
let notificationQueueMessageSenderMock: IMock<NotificationMessageDispatcher>;
let loggerMock: IMock<GlobalLogger>;
let scanNotificationProcessor: ScanNotificationProcessor;
let featureFlagsConfig: FeatureFlags;
let scanConfig: ScanRunTimeConfig;
let scanMetadata: ScanMetadata;
let pageScanResult: OnDemandPageScanResult;
let websiteScanResult: WebsiteScanResult;

describe(ScanNotificationProcessor, () => {
    beforeEach(() => {
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        notificationQueueMessageSenderMock = Mock.ofType(NotificationMessageDispatcher);
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
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('scanConfig'))
            .returns(async () => scanConfig)
            .verifiable();
        scanMetadata = {
            id: 'scanMetadataId',
            deepScan: false,
        } as ScanMetadata;
        websiteScanResult = {
            id: 'websiteScanResultId',
            deepScanId: 'deepScanId',
            pageScans: [
                {
                    scanId: 'scanId',
                    runState: 'completed',
                },
            ],
        } as WebsiteScanResult;
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
        websiteScanResult = {} as WebsiteScanResult;
        setupLoggerForSingleScan();
        setupNotificationQueueMessageSender();
        await scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
    });

    it('send scan notification for a failed scan', async () => {
        websiteScanResult = {} as WebsiteScanResult;
        pageScanResult = {
            id: 'pageScanResultId',
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
        await scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
    });

    it('skip notification for a failed scan with available retry', async () => {
        websiteScanResult = {} as WebsiteScanResult;
        pageScanResult = {
            id: 'pageScanResultId',
            notification: {
                scanNotifyUrl: 'scanNotifyUrl',
            },
            run: {
                state: 'failed',
                retryCount: 0,
            },
        } as OnDemandPageScanResult;
        await scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
    });

    it('skip notification if feature flag is disabled', async () => {
        featureFlagsConfig.sendNotification = false;
        loggerMock
            .setup((o) => o.logInfo('The send scan completion feature flag is disabled.', { sendNotificationFlag: 'false' }))
            .verifiable();
        await scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
    });

    it('skip notification if notification URL is not defined', async () => {
        loggerMock
            .setup((o) => o.logInfo('The send scan completion feature flag is enabled.', { sendNotificationFlag: 'true' }))
            .verifiable();
        loggerMock
            .setup((o) => o.logInfo(`Scan notification URL was not provided. Skip sending scan completion notification queue message.`))
            .verifiable();
        pageScanResult.notification = undefined;
        await scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
    });

    it('skip notification if deep scan is not completed', async () => {
        loggerMock
            .setup((o) => o.logInfo('The send scan completion feature flag is enabled.', { sendNotificationFlag: 'true' }))
            .verifiable();
        scanMetadata.deepScan = true;
        websiteScanResult.pageScans = [
            {
                scanId: 'scanId',
            } as PageScan,
        ];
        await scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
    });

    it('send scan notification for a deep scan', async () => {
        scanMetadata.deepScan = true;
        setupLoggerForDeepScan();
        setupNotificationQueueMessageSender();
        await scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);
    });
});

function setupLoggerForDeepScan(): void {
    loggerMock
        .setup((o) =>
            o.logInfo('Sending scan completion notification message for a deep scan.', {
                deepScanId: websiteScanResult?.deepScanId,
                scannedPages: websiteScanResult.pageScans.length.toString(),
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            }),
        )
        .verifiable();
}

function setupLoggerForSingleScan(): void {
    loggerMock
        .setup((o) =>
            o.logInfo('Sending scan completion notification message for a single scan.', {
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
        deepScanId: websiteScanResult.deepScanId,
    } as OnDemandNotificationRequestMessage;
    notificationQueueMessageSenderMock.setup((o) => o.sendNotificationMessage(notificationRequestMessage)).verifiable();
}
