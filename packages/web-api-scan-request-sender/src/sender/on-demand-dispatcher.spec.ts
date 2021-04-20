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
const scanQueueName = 'scanQueueName';

let queueMock: IMock<Queue>;
let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let scanRequestSelectorMock: IMock<ScanRequestSelector>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let storageConfigMock: IMock<StorageConfig>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
let onDemandDispatcher: OnDemandDispatcher;
let maxQueueSize: number;
let messageCount: number;
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
        messageCount = 0;
        storageConfigMock
            .setup((o) => o.scanQueue)
            .returns(() => scanQueueName)
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

    it('skip dispatcher run when queue is full', async () => {
        messageCount = maxQueueSize;
        setupServiceConfiguration();
        setupQueue();
        loggerMock
            .setup((o) => o.logInfo('Skip adding new scan requests as scan task queue already reached to its maximum capacity.'))
            .verifiable();

        await onDemandDispatcher.dispatchScanRequests();
    });

    it('delete scan requests', async () => {
        const scanRequests = {
            toQueue: [],
            toDelete: [
                {
                    request: { id: 'id1' },
                },
                {
                    request: { id: 'id2' },
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
        const error: ScanError = {
            errorType: 'InternalError',
            message: 'Failed to create a scan request queue message.',
        };
        const scanRequests = {
            toDelete: [],
            toQueue: [
                {
                    request: { id: 'id1', url: 'url1', deepScan: true, created: true },
                    result: { run: { retryCount: 1 } },
                },
                {
                    request: { id: 'id2', url: 'url2', deepScan: false, created: true },
                    result: {},
                },
                {
                    request: { id: 'id3', url: 'url3', deepScan: false, created: false, error },
                    result: {},
                },
            ],
        } as any;
        loggerMock
            .setup((o) =>
                o.trackEvent('ScanRequestQueued', null, {
                    queuedScanRequests: scanRequests.toQueue.filter((r: any) => r.request.created).length,
                }),
            )
            .verifiable();

        setupServiceConfiguration();
        setupQueue(scanRequests);
        setupScanRequestSelector(scanRequests);
        setupPageScanRequestProvider(scanRequests);
        setupOnDemandPageScanRunResultProvider(scanRequests);

        await onDemandDispatcher.dispatchScanRequests();
    });
});

function setupOnDemandPageScanRunResultProvider(scanRequests: ScanRequests): void {
    scanRequests.toQueue.map((scanRequest: any) => {
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
            .verifiable();
    });
}

function setupPageScanRequestProvider(scanRequests: ScanRequests): void {
    scanRequests.toDelete.map((scanRequest) => {
        pageScanRequestProviderMock.setup((o) => o.deleteRequests([scanRequest.request.id])).verifiable();
    });
}

function setupScanRequestSelector(scanRequests: ScanRequests): void {
    scanRequestSelectorMock
        .setup((o) => o.getRequests(maxQueueSize - messageCount))
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
        .setup((o) => o.getMessageCount(scanQueueName))
        .returns(() => Promise.resolve(messageCount))
        .verifiable();

    if (scanRequests) {
        scanRequests.toQueue.map((scanRequest: any) => {
            const message = {
                id: scanRequest.request.id,
                url: scanRequest.request.url,
                deepScan: scanRequest.request.deepScan,
            };
            queueMock
                .setup((o) => o.createMessage(scanQueueName, message))
                .returns(() => Promise.resolve(scanRequest.request.created))
                .verifiable();
        });
    }
}
