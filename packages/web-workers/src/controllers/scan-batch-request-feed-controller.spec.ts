// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import * as MockDate from 'mockdate';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider, PartitionKeyFactory, ScanDataProvider } from 'service-library';
import { ItemType, OnDemandPageScanBatchRequest, OnDemandPageScanRequest, OnDemandPageScanResult, PartitionKey } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';

import { ScanBatchRequestFeedController } from './scan-batch-request-feed-controller';

// tslint:disable: no-any no-unsafe-any

let scanBatchRequestFeedController: ScanBatchRequestFeedController;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let scanDataProviderMock: IMock<ScanDataProvider>;
let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let contextAwareLoggerMock: IMock<ContextAwareLogger>;
let context: Context;
let dateNow: Date;

beforeEach(() => {
    dateNow = new Date();
    MockDate.set(dateNow);

    onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);
    pageScanRequestProviderMock = Mock.ofType(PageScanRequestProvider);
    scanDataProviderMock = Mock.ofType(ScanDataProvider);
    partitionKeyFactoryMock = Mock.ofType(PartitionKeyFactory);
    serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
    contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);
    context = <Context>(<unknown>{ bindingDefinitions: {} });

    scanBatchRequestFeedController = new ScanBatchRequestFeedController(
        onDemandPageScanRunResultProviderMock.object,
        pageScanRequestProviderMock.object,
        scanDataProviderMock.object,
        partitionKeyFactoryMock.object,
        serviceConfigurationMock.object,
        contextAwareLoggerMock.object,
    );
});

afterEach(() => {
    MockDate.reset();
    onDemandPageScanRunResultProviderMock.verifyAll();
    pageScanRequestProviderMock.verifyAll();
    scanDataProviderMock.verifyAll();
    partitionKeyFactoryMock.verifyAll();
    contextAwareLoggerMock.verifyAll();
});

describe(ScanBatchRequestFeedController, () => {
    it('should skip processing on invalid undefined documents', async () => {
        setupMocksWithTimesNever();
        await scanBatchRequestFeedController.invoke(context);
    });

    it('should skip processing on invalid empty documents', async () => {
        setupMocksWithTimesNever();
        await scanBatchRequestFeedController.invoke(context, <OnDemandPageScanBatchRequest[]>(<unknown>[]));
    });

    it('should skip processing on other document type', async () => {
        setupMocksWithTimesNever();
        await scanBatchRequestFeedController.invoke(context, <OnDemandPageScanBatchRequest[]>(<unknown>[{ ItemType: ItemType.page }]));
    });

    it('should skip processing if request has no valid accepted scans', async () => {
        setupMocksWithTimesNever();
        await scanBatchRequestFeedController.invoke(context, <OnDemandPageScanBatchRequest[]>(
            (<unknown>[{ ItemType: ItemType.scanRunBatchRequest }])
        ));
    });

    it('should process valid scans', async () => {
        const documents = [
            {
                id: '1',
                partitionKey: 'pk-1',
                itemType: ItemType.scanRunBatchRequest,
                scanRunBatchRequest: [
                    {
                        scanId: 'scan-1',
                        url: 'url-1',
                        priority: 1,
                    },
                    {
                        scanId: 'scan-2',
                        url: 'url-2',
                        priority: 0,
                    },
                    {
                        url: 'url-3',
                        error: 'error-3',
                        priority: -3,
                    },
                ],
            },
            {
                id: '2',
                partitionKey: 'pk-2',
                itemType: ItemType.scanRunBatchRequest,
                scanRunBatchRequest: [
                    {
                        scanId: 'scan-4',
                        url: 'url-4',
                        priority: 0,
                    },
                    {
                        scanId: 'scan-5',
                        url: 'url-5',
                        priority: 2,
                    },
                ],
            },
        ] as OnDemandPageScanBatchRequest[];
        setupOnDemandPageScanRunResultProviderMock(documents);
        setupPageScanRequestProviderMock(documents);
        setupPartitionKeyFactoryMock(documents);
        // tslint:disable-next-line: no-null-keyword
        contextAwareLoggerMock
            .setup(lm => lm.trackEvent('ScanRequestsAccepted', { batchRequestId: documents[0].id }, { addedUrls: 2 }))
            .verifiable(Times.once());
        contextAwareLoggerMock
            .setup(lm => lm.trackEvent('ScanRequestsAccepted', { batchRequestId: documents[1].id }, { addedUrls: 2 }))
            .verifiable(Times.once());

        await scanBatchRequestFeedController.invoke(context, documents);
    });
});

function setupOnDemandPageScanRunResultProviderMock(documents: OnDemandPageScanBatchRequest[]): void {
    documents.map(document => {
        const dbDocuments = document.scanRunBatchRequest
            .filter(request => request.scanId !== undefined)
            .map<OnDemandPageScanResult>(request => {
                return {
                    id: request.scanId,
                    url: request.url,
                    priority: request.priority,
                    itemType: ItemType.onDemandPageScanRunResult,
                    partitionKey: `pk-${request.scanId}`,
                    run: {
                        state: 'accepted',
                        timestamp: dateNow.toJSON(),
                    },
                    batchRequestId: document.id,
                };
            });
        onDemandPageScanRunResultProviderMock.setup(async o => o.writeScanRuns(dbDocuments)).verifiable(Times.once());
    });
}

function setupPageScanRequestProviderMock(documents: OnDemandPageScanBatchRequest[]): void {
    documents.map(document => {
        const dbDocuments = document.scanRunBatchRequest
            .filter(request => request.scanId !== undefined)
            .map<OnDemandPageScanRequest>(request => {
                return {
                    id: request.scanId,
                    url: request.url,
                    priority: request.priority,
                    itemType: ItemType.onDemandPageScanRequest,
                    partitionKey: PartitionKey.pageScanRequestDocuments,
                };
            });
        pageScanRequestProviderMock.setup(async o => o.insertRequests(dbDocuments)).verifiable(Times.once());
        scanDataProviderMock.setup(async o => o.deleteBatchRequest(document)).verifiable(Times.once());
    });
}

function setupPartitionKeyFactoryMock(documents: OnDemandPageScanBatchRequest[]): void {
    documents.map(document => {
        document.scanRunBatchRequest.map(request => {
            if (request.scanId !== undefined) {
                partitionKeyFactoryMock
                    .setup(o => o.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, request.scanId))
                    .returns(() => `pk-${request.scanId}`)
                    .verifiable(Times.once());
            }
        });
    });
}

function setupMocksWithTimesNever(): void {
    onDemandPageScanRunResultProviderMock.setup(async o => o.writeScanRuns(It.isAny())).verifiable(Times.never());
    pageScanRequestProviderMock.setup(async o => o.insertRequests(It.isAny())).verifiable(Times.never());
    scanDataProviderMock.setup(async o => o.deleteBatchRequest(It.isAny())).verifiable(Times.never());
    partitionKeyFactoryMock.setup(o => o.createPartitionKeyForDocument(It.isAny(), It.isAny())).verifiable(Times.never());
}
