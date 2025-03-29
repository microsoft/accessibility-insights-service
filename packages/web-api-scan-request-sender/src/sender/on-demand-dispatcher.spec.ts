// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { Logger } from 'logger';
import {
    PageScanRequestProvider,
    OnDemandPageScanRunResultProvider,
    OperationResult,
    WebsiteScanDataProvider,
    ScanNotificationProcessor,
} from 'service-library';
import { ServiceConfiguration, QueueRuntimeConfig } from 'common';
import { Queue, StorageConfig } from 'azure-services';
import { KnownPage, OnDemandPageScanResult, ScanError, ScanType, WebsiteScanData, WebsiteScanRef } from 'storage-documents';
import * as MockDate from 'mockdate';
import { cloneDeep } from 'lodash';
import { OnDemandDispatcher } from './on-demand-dispatcher';
import { ScanRequestSelector, ScanRequests } from './scan-request-selector';

/* eslint-disable @typescript-eslint/no-explicit-any */

const accessabilityScanQueueName = 'accessabilityScanQueueName';
const privacyScanQueueName = 'privacyScanQueueName';
const targetDeleteRequests = 100;

let queueMock: IMock<Queue>;
let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let scanRequestSelectorMock: IMock<ScanRequestSelector>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let scanNotificationProcessorMock: IMock<ScanNotificationProcessor>;
let storageConfigMock: IMock<StorageConfig>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;
let onDemandDispatcher: OnDemandDispatcher;
let targetQueueSize: number;
let accessibilityQueueMessageCount: number;
let privacyQueueMessageCount: number;
let dateNow: Date;

describe(OnDemandDispatcher, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        queueMock = Mock.ofType<Queue>();
        pageScanRequestProviderMock = Mock.ofType<PageScanRequestProvider>();
        scanRequestSelectorMock = Mock.ofType<ScanRequestSelector>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        scanNotificationProcessorMock = Mock.ofType<ScanNotificationProcessor>();
        storageConfigMock = Mock.ofType<StorageConfig>();
        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<Logger>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();

        targetQueueSize = 10;
        accessibilityQueueMessageCount = 0;
        privacyQueueMessageCount = 0;
        storageConfigMock
            .setup((o) => o.scanQueue)
            .returns(() => accessabilityScanQueueName)
            .verifiable(Times.atLeastOnce());
        storageConfigMock
            .setup((o) => o.privacyScanQueue)
            .returns(() => privacyScanQueueName)
            .verifiable(Times.atLeastOnce());

        onDemandDispatcher = new OnDemandDispatcher(
            queueMock.object,
            pageScanRequestProviderMock.object,
            scanRequestSelectorMock.object,
            onDemandPageScanRunResultProviderMock.object,
            websiteScanDataProviderMock.object,
            scanNotificationProcessorMock.object,
            storageConfigMock.object,
            serviceConfigurationMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        queueMock.verifyAll();
        pageScanRequestProviderMock.verifyAll();
        scanRequestSelectorMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        scanNotificationProcessorMock.verifyAll();
        storageConfigMock.verifyAll();
        serviceConfigurationMock.verifyAll();
        loggerMock.verifyAll();
        websiteScanDataProviderMock.verifyAll();
    });

    it('skip dispatcher run when all queues are full', async () => {
        const scanRequests: ScanRequests = {
            queueRequests: [],
            deleteRequests: [],
        };

        accessibilityQueueMessageCount = targetQueueSize;
        privacyQueueMessageCount = targetQueueSize;
        setupServiceConfiguration();
        setupQueue();
        setupScanRequestSelector(scanRequests);
        loggerMock.setup((o) => o.logInfo(`The accessibility scan queue has reached the target capacity.`)).verifiable();
        loggerMock.setup((o) => o.logInfo(`The privacy scan queue has reached the target capacity.`)).verifiable();

        await onDemandDispatcher.dispatchScanRequests();
    });

    it('delete scan requests', async () => {
        const scanRequests = {
            queueRequests: [],
            deleteRequests: [
                {
                    request: { id: 'id1' },
                    condition: 'completed',
                },
                {
                    request: { id: 'id2' },
                    result: {
                        run: {
                            state: 'failed',
                            timestamp: new Date().toJSON(),
                            retryCount: 2,
                        },
                    },
                    condition: 'noRetry',
                },
                {
                    request: { id: 'id3' },
                    condition: 'notFound',
                },
            ],
        } as ScanRequests;

        setupServiceConfiguration();
        setupQueue();
        setupScanRequestSelector(scanRequests);
        setupPageScanRequestProvider(scanRequests);

        await onDemandDispatcher.dispatchScanRequests();
    });

    it('update scan run state on delete', async () => {
        const scanRequests = {
            queueRequests: [],
            deleteRequests: [
                {
                    request: { id: 'id2' },
                    result: {
                        run: {
                            state: 'running',
                            timestamp: new Date().toJSON(),
                            retryCount: 2,
                        },
                    },
                    condition: 'stale',
                },
                {
                    request: { id: 'id3' },
                    result: {
                        run: {
                            state: 'failed',
                            timestamp: new Date().toJSON(),
                            retryCount: 2,
                        },
                    },
                    condition: 'noRetry',
                },
            ],
        } as ScanRequests;

        setupServiceConfiguration();
        setupQueue();
        setupScanRequestSelector(scanRequests);
        setupPageScanRequestProvider(scanRequests);

        const pageScanResult = cloneDeep(scanRequests.deleteRequests[0].result);
        pageScanResult.run.state = 'failed';
        pageScanResult.run.error = `The scan request was abandon in a service pipeline. State: ${JSON.stringify(
            scanRequests.deleteRequests[0].result.run,
        )}`;

        onDemandPageScanRunResultProviderMock
            .setup((o) => o.updateScanRun(It.isValue(pageScanResult)))
            .returns(() => Promise.resolve(undefined))
            .verifiable();

        await onDemandDispatcher.dispatchScanRequests();
    });

    it.each([undefined, {}, { scanId: 'scanId' }, { scanId: 'otherId' }])(
        'update website`s page scan metadata on delete when pageScans is [%s]',
        async (pageState) => {
            const scanRequests = {
                queueRequests: [],
                deleteRequests: [
                    {
                        request: { id: 'id2' },
                        result: {
                            id: 'scanId',
                            url: 'url',
                            scanResult: {
                                state: 'fail',
                            },
                            run: {
                                state: 'running',
                                timestamp: new Date().toJSON(),
                                retryCount: 2,
                            },
                            websiteScanRef: {
                                id: 'websiteScanRefId',
                                scanGroupType: 'deep-scan',
                            },
                        },
                        condition: 'noRetry',
                    },
                ],
            } as ScanRequests;

            setupServiceConfiguration();
            setupQueue();
            setupScanRequestSelector(scanRequests);
            setupPageScanRequestProvider(scanRequests);

            const pageScanResult = scanRequests.deleteRequests[0].result;
            const websiteScanData = { knownPages: pageState ? [pageState] : undefined } as WebsiteScanData;
            websiteScanDataProviderMock
                .setup((o) => o.read(pageScanResult.websiteScanRef.id))
                .returns(() => Promise.resolve(websiteScanData))
                .verifiable(Times.atLeastOnce());
            const knownPage = {
                scanId: pageScanResult.id,
                url: pageScanResult.url,
                scanState: pageScanResult.scanResult?.state,
                runState: 'failed',
            } as KnownPage;
            const updatedWebsiteScanDataDb = {
                knownPages: [knownPage],
            } as WebsiteScanData;
            websiteScanDataProviderMock
                .setup((o) => o.updateKnownPages(websiteScanData, [knownPage]))
                .returns(() => Promise.resolve(updatedWebsiteScanDataDb))
                .verifiable(Times.atLeastOnce());

            scanNotificationProcessorMock
                .setup((o) =>
                    o.sendScanCompletionNotification(
                        It.isObjectWith({ id: pageScanResult.id } as OnDemandPageScanResult),
                        updatedWebsiteScanDataDb,
                    ),
                )
                .returns(() => Promise.resolve())
                .verifiable(Times.exactly(2));

            await onDemandDispatcher.dispatchScanRequests();
        },
    );

    it('queue scan requests', async () => {
        const accessibilityError: ScanError = {
            errorType: 'InternalError',
            message: `Failed to add a scan request message to the ${accessabilityScanQueueName} scan queue.`,
        };
        const scanRequests = {
            deleteRequests: [],
            queueRequests: [
                {
                    request: { id: 'id1', url: 'url1', deepScan: true, created: true },
                    result: { run: { retryCount: 1 } },
                    condition: 'accepted',
                },
                {
                    request: { id: 'id2', url: 'url2', deepScan: false, created: true },
                    result: {},
                    condition: 'accepted',
                },
                {
                    request: { id: 'id3', url: 'url3', deepScan: false, created: false, error: accessibilityError },
                    result: {},
                    condition: 'noRetry',
                },
            ],
        } as any;

        const requestsQueued = scanRequests.queueRequests.filter((r: any) => r.request.created).length;
        loggerMock
            .setup((o) =>
                o.trackEvent('ScanRequestQueued', null, {
                    queuedScanRequests: requestsQueued,
                }),
            )
            .verifiable(Times.atLeastOnce());

        setupServiceConfiguration();
        setupQueue('accessibility', scanRequests);
        setupScanRequestSelector(scanRequests, 'accessibility');
        setupScanRequestSelector(
            {
                queueRequests: [],
                deleteRequests: [],
            },
            'privacy',
        );

        setupPageScanRequestProvider(scanRequests);
        setupOnDemandPageScanRunResultProvider(scanRequests);

        await onDemandDispatcher.dispatchScanRequests();
    });
});

function setupOnDemandPageScanRunResultProvider(scanRequests: ScanRequests): void {
    const setupFunc = (scanRequest: any) => {
        const scanRequestClone = cloneDeep(scanRequest);
        scanRequestClone.result.run = {
            state: scanRequest.request.created ? 'queued' : 'failed',
            timestamp: new Date().toJSON(),
            error: scanRequest.request.error ?? null,
            retryCount: scanRequest.result.run?.retryCount ? scanRequest.result.run.retryCount + 1 : 0,
        };

        onDemandPageScanRunResultProviderMock
            .setup((o) => o.tryUpdateScanRun(It.isValue(scanRequestClone.result)))
            .returns(() => Promise.resolve({ succeeded: true } as OperationResult<OnDemandPageScanResult>))
            .verifiable(Times.atLeastOnce());
    };

    scanRequests.queueRequests.map(setupFunc);
}

function setupPageScanRequestProvider(scanRequests: ScanRequests): void {
    scanRequests.deleteRequests.map((scanRequest) => {
        if (scanRequest.result) {
            scanRequest.result.websiteScanRef = scanRequest.result.websiteScanRef ?? ({ id: 'websiteScanRefId' } as WebsiteScanRef);
        }
        pageScanRequestProviderMock.setup((o) => o.deleteRequests([scanRequest.request.id])).verifiable(Times.exactly(2));
    });
}

function setupScanRequestSelector(scanRequests: ScanRequests, scanType: ScanType = undefined): void {
    scanRequestSelectorMock
        .setup((o) => o.getRequests(scanType ?? It.isAny(), It.isAny(), targetDeleteRequests))
        .returns(() => Promise.resolve(scanRequests))
        .verifiable(Times.atLeastOnce());
}

function setupServiceConfiguration(): void {
    serviceConfigurationMock
        .setup((o) => o.getConfigValue('queueConfig'))
        .returns(() => Promise.resolve({ maxQueueSize: targetQueueSize } as QueueRuntimeConfig))
        .verifiable();
}

function setupQueue(scanType: ScanType = undefined, scanRequests: ScanRequests = undefined): void {
    queueMock
        .setup((o) => o.getMessageCount(accessabilityScanQueueName))
        .returns(() => Promise.resolve(accessibilityQueueMessageCount))
        .verifiable();
    queueMock
        .setup((o) => o.getMessageCount(privacyScanQueueName))
        .returns(() => Promise.resolve(privacyQueueMessageCount))
        .verifiable();

    if (scanRequests?.queueRequests && scanType === 'accessibility') {
        scanRequests.queueRequests.map((scanRequest: any) => {
            const message = {
                id: scanRequest.request.id,
                url: scanRequest.request.url,
                deepScan: scanRequest.request.deepScan,
            };
            queueMock
                .setup((o) => o.createMessage(accessabilityScanQueueName, message))
                .returns(() => Promise.resolve(scanRequest.request.created))
                .verifiable();
        });
    }

    if (scanRequests?.queueRequests && scanType === 'privacy') {
        scanRequests.queueRequests.map((scanRequest: any) => {
            const message = {
                id: scanRequest.request.id,
                url: scanRequest.request.url,
                deepScan: scanRequest.request.deepScan,
            };
            queueMock
                .setup((o) => o.createMessage(privacyScanQueueName, message))
                .returns(() => Promise.resolve(scanRequest.request.created))
                .verifiable();
        });
    }
}
