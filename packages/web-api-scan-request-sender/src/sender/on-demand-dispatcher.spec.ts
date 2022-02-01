// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { Logger } from 'logger';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider, OperationResult } from 'service-library';
import { ServiceConfiguration, QueueRuntimeConfig } from 'common';
import { Queue, StorageConfig } from 'azure-services';
import { OnDemandPageScanResult, ScanError } from 'storage-documents';
import * as MockDate from 'mockdate';
import _ from 'lodash';
import { OnDemandDispatcher } from './on-demand-dispatcher';
import { ScanRequestSelector, ScanRequests } from './scan-request-selector';

/* eslint-disable @typescript-eslint/no-explicit-any */
const accessabilityScanQueueName = 'accessabilityScanQueueName';
const privacyScanQueueName = 'privacyScanQueueName';

let queueMock: IMock<Queue>;
let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let scanRequestSelectorMock: IMock<ScanRequestSelector>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let storageConfigMock: IMock<StorageConfig>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
let onDemandDispatcher: OnDemandDispatcher;
let maxQueueSize: number;
let accessibilityMessageCount: number;
let privacyMessageCount: number;
let dateNow: Date;

describe(OnDemandDispatcher, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        queueMock = Mock.ofType<Queue>();
        pageScanRequestProviderMock = Mock.ofType<PageScanRequestProvider>();
        scanRequestSelectorMock = Mock.ofType<ScanRequestSelector>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        storageConfigMock = Mock.ofType<StorageConfig>();
        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<Logger>();

        maxQueueSize = 10;
        accessibilityMessageCount = 0;
        privacyMessageCount = 0;
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
        storageConfigMock.verifyAll();
        serviceConfigurationMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('skip dispatcher run when all queues are full', async () => {
        accessibilityMessageCount = maxQueueSize;
        privacyMessageCount = maxQueueSize;
        setupServiceConfiguration();
        setupQueue();
        loggerMock
            .setup((o) => o.logInfo('Skip adding new scan requests as all scan queues already reached maximum capacity.'))
            .verifiable();

        await onDemandDispatcher.dispatchScanRequests();
    });

    it('delete scan requests', async () => {
        const scanRequests = {
            accessibilityRequestsToQueue: [],
            privacyRequestsToQueue: [],
            requestsToDelete: [
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

    it('queue scan requests', async () => {
        const accessibilityError: ScanError = {
            errorType: 'InternalError',
            message: `Failed to add a scan request message to the ${accessabilityScanQueueName} scan queue.`,
        };
        const privacyError: ScanError = {
            errorType: 'InternalError',
            message: `Failed to add a scan request message to the ${privacyScanQueueName} scan queue.`,
        };
        const scanRequests = {
            requestsToDelete: [],
            accessibilityRequestsToQueue: [
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
            privacyRequestsToQueue: [
                {
                    request: { id: 'id4', url: 'url4', deepScan: true, created: true, privacyScan: {} },
                    result: { run: { retryCount: 1 } },
                    condition: 'accepted',
                },
                {
                    request: { id: 'id5', url: 'url5', deepScan: false, created: true, privacyScan: {} },
                    result: {},
                    condition: 'accepted',
                },
                {
                    request: { id: 'id6', url: 'url6', deepScan: false, created: false, privacyScan: {}, error: privacyError },
                    result: {},
                    condition: 'noRetry',
                },
            ],
        } as any;

        const accessibilityRequestsQueued = scanRequests.accessibilityRequestsToQueue.filter((r: any) => r.request.created).length;
        const privacyRequestsQueued = scanRequests.privacyRequestsToQueue.filter((r: any) => r.request.created).length;
        loggerMock
            .setup((o) =>
                o.trackEvent('ScanRequestQueued', null, {
                    queuedScanRequests: accessibilityRequestsQueued,
                }),
            )
            .verifiable(Times.atLeastOnce());
        loggerMock
            .setup((o) =>
                o.trackEvent('ScanRequestQueued', null, {
                    queuedScanRequests: privacyRequestsQueued,
                }),
            )
            .verifiable(Times.atLeastOnce());

        setupServiceConfiguration();
        setupQueue(scanRequests);
        setupScanRequestSelector(scanRequests);
        setupPageScanRequestProvider(scanRequests);
        setupOnDemandPageScanRunResultProvider(scanRequests);

        await onDemandDispatcher.dispatchScanRequests();
    });
});

function setupOnDemandPageScanRunResultProvider(scanRequests: ScanRequests): void {
    const setupFunc = (scanRequest: any) => {
        const scanRequestClone = _.cloneDeep(scanRequest);
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

    scanRequests.accessibilityRequestsToQueue.map(setupFunc);
    scanRequests.privacyRequestsToQueue.map(setupFunc);
}

function setupPageScanRequestProvider(scanRequests: ScanRequests): void {
    scanRequests.requestsToDelete.map((scanRequest) => {
        pageScanRequestProviderMock.setup((o) => o.deleteRequests([scanRequest.request.id])).verifiable();
    });
}

function setupScanRequestSelector(scanRequests: ScanRequests): void {
    scanRequestSelectorMock
        .setup((o) => o.getRequests(maxQueueSize - accessibilityMessageCount, maxQueueSize - privacyMessageCount))
        .returns(() => Promise.resolve(scanRequests))
        .verifiable();
}

function setupServiceConfiguration(): void {
    serviceConfigurationMock
        .setup((o) => o.getConfigValue('queueConfig'))
        .returns(() => Promise.resolve({ maxQueueSize } as QueueRuntimeConfig))
        .verifiable();
}

function setupQueue(scanRequests: ScanRequests = undefined): void {
    queueMock
        .setup((o) => o.getMessageCount(accessabilityScanQueueName))
        .returns(() => Promise.resolve(accessibilityMessageCount))
        .verifiable();
    queueMock
        .setup((o) => o.getMessageCount(privacyScanQueueName))
        .returns(() => Promise.resolve(privacyMessageCount))
        .verifiable();

    if (scanRequests?.accessibilityRequestsToQueue) {
        scanRequests.accessibilityRequestsToQueue.map((scanRequest: any) => {
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

    if (scanRequests?.privacyRequestsToQueue) {
        scanRequests.privacyRequestsToQueue.map((scanRequest: any) => {
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
