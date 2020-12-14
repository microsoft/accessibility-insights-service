// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { isEmpty, isNil } from 'lodash';
import * as MockDate from 'mockdate';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebsiteScanResultProvider,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanBatchRequest,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    PartitionKey,
    WebsiteScanResult,
    WebsiteScanRef,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ScanBatchRequestFeedController } from './scan-batch-request-feed-controller';

/* eslint-disable @typescript-eslint/no-explicit-any,  */

let scanBatchRequestFeedController: ScanBatchRequestFeedController;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let pageScanRequestProviderMock: IMock<PageScanRequestProvider>;
let scanDataProviderMock: IMock<ScanDataProvider>;
let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<MockableLogger>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
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
    loggerMock = Mock.ofType(MockableLogger);
    websiteScanResultProviderMock = Mock.ofType(WebsiteScanResultProvider);
    context = <Context>(<unknown>{ bindingDefinitions: {} });

    scanBatchRequestFeedController = new ScanBatchRequestFeedController(
        onDemandPageScanRunResultProviderMock.object,
        pageScanRequestProviderMock.object,
        scanDataProviderMock.object,
        websiteScanResultProviderMock.object,
        partitionKeyFactoryMock.object,
        serviceConfigurationMock.object,
        loggerMock.object,
    );
});

afterEach(() => {
    MockDate.reset();

    onDemandPageScanRunResultProviderMock.verifyAll();
    pageScanRequestProviderMock.verifyAll();
    scanDataProviderMock.verifyAll();
    websiteScanResultProviderMock.verifyAll();
    partitionKeyFactoryMock.verifyAll();
    loggerMock.verifyAll();
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
        await scanBatchRequestFeedController.invoke(context, <OnDemandPageScanBatchRequest[]>(
            (<unknown>[{ ItemType: ItemType.onDemandPageScanRequest }])
        ));
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
                        scanNotifyUrl: 'reply-url-1',
                        site: {
                            baseUrl: 'base-url-1',
                        },
                        reportGroups: [{ consolidatedId: 'consolidated-id-1' }],
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

        const websiteScanResults = setupWebsiteScanResultProviderMock(documents);
        setupOnDemandPageScanRunResultProviderMock(documents, websiteScanResults);
        setupPageScanRequestProviderMock(documents);
        setupPartitionKeyFactoryMock(documents);
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestAccepted', { batchRequestId: documents[0].id }, { acceptedScanRequests: 2 }))
            .verifiable(Times.once());
        loggerMock
            .setup((lm) => lm.trackEvent('ScanRequestAccepted', { batchRequestId: documents[1].id }, { acceptedScanRequests: 2 }))
            .verifiable(Times.once());

        await scanBatchRequestFeedController.invoke(context, documents);
    });
});

function setupWebsiteScanResultProviderMock(documents: OnDemandPageScanBatchRequest[]): Partial<WebsiteScanResult>[] {
    const websiteScanRequests: Partial<WebsiteScanResult>[] = [];
    documents.map((document) => {
        document.scanRunBatchRequest
            .filter((request) => request.reportGroups !== undefined)
            .map((request) => {
                request.reportGroups.map((reportGroup) => {
                    const websiteScanResult = {
                        baseUrl: request.site.baseUrl,
                        scanGroupId: reportGroup.consolidatedId,
                        scanGroupType: 'consolidated-scan-report',
                        pageScans: [
                            {
                                scanId: request.scanId,
                                url: request.url,
                                timestamp: dateNow.toJSON(),
                            },
                        ],
                    } as WebsiteScanResult;

                    const documentId = `db-id-${reportGroup.consolidatedId}`;
                    websiteScanRequests.push({ ...websiteScanResult, id: documentId });
                    websiteScanResultProviderMock
                        .setup(async (o) => o.mergeOrCreate(It.isValue(websiteScanResult)))
                        .returns(() => Promise.resolve({ ...websiteScanResult, id: documentId }))
                        .verifiable();
                });
            });
    });

    return websiteScanRequests;
}

function setupOnDemandPageScanRunResultProviderMock(
    documents: OnDemandPageScanBatchRequest[],
    websiteScanResults: Partial<WebsiteScanResult>[],
): void {
    documents.map((document) => {
        const dbDocuments = document.scanRunBatchRequest
            .filter((request) => request.scanId !== undefined)
            .map<OnDemandPageScanResult>((request) => {
                const websiteScanRefs = websiteScanResults
                    .filter((r) => r.pageScans[0].scanId === request.scanId)
                    .map((r) => {
                        return { id: r.id, scanGroupType: 'consolidated-scan-report' } as WebsiteScanRef;
                    });
                const result: OnDemandPageScanResult = {
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
                    websiteScanRefs: websiteScanRefs.length > 0 ? websiteScanRefs : undefined,
                };

                if (request.scanNotifyUrl !== undefined) {
                    result.notification = {
                        state: 'pending',
                        scanNotifyUrl: request.scanNotifyUrl,
                    };
                }

                return result;
            });
        onDemandPageScanRunResultProviderMock.setup(async (o) => o.writeScanRuns(It.isValue(dbDocuments))).verifiable(Times.once());
    });
}

function setupPageScanRequestProviderMock(documents: OnDemandPageScanBatchRequest[]): void {
    documents.map((document) => {
        const dbDocuments = document.scanRunBatchRequest
            .filter((batchRequest) => batchRequest.scanId !== undefined)
            .map<OnDemandPageScanRequest>((scanRequest) => {
                const request: OnDemandPageScanRequest = {
                    id: scanRequest.scanId,
                    url: scanRequest.url,
                    priority: scanRequest.priority,
                    itemType: ItemType.onDemandPageScanRequest,
                    partitionKey: PartitionKey.pageScanRequestDocuments,
                };

                if (!isNil(scanRequest.scanNotifyUrl)) {
                    request.scanNotifyUrl = scanRequest.scanNotifyUrl;
                }

                if (!isNil(scanRequest.site)) {
                    request.site = scanRequest.site;
                }

                if (!isEmpty(scanRequest.reportGroups)) {
                    request.reportGroups = scanRequest.reportGroups;
                }

                return request;
            });
        pageScanRequestProviderMock.setup(async (o) => o.insertRequests(dbDocuments)).verifiable(Times.once());
        scanDataProviderMock.setup(async (o) => o.deleteBatchRequest(document)).verifiable(Times.once());
    });
}

function setupPartitionKeyFactoryMock(documents: OnDemandPageScanBatchRequest[]): void {
    documents.map((document) => {
        document.scanRunBatchRequest.map((request) => {
            if (request.scanId !== undefined) {
                partitionKeyFactoryMock
                    .setup((o) => o.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, request.scanId))
                    .returns(() => `pk-${request.scanId}`)
                    .verifiable(Times.once());
            }
        });
    });
}

function setupMocksWithTimesNever(): void {
    onDemandPageScanRunResultProviderMock.setup(async (o) => o.writeScanRuns(It.isAny())).verifiable(Times.never());
    pageScanRequestProviderMock.setup(async (o) => o.insertRequests(It.isAny())).verifiable(Times.never());
    scanDataProviderMock.setup(async (o) => o.deleteBatchRequest(It.isAny())).verifiable(Times.never());
    partitionKeyFactoryMock.setup((o) => o.createPartitionKeyForDocument(It.isAny(), It.isAny())).verifiable(Times.never());
}
