// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GuidGenerator, ServiceConfiguration, Url } from 'common';
import { cloneDeep, isEmpty, isNil, pullAllBy, uniqBy } from 'lodash';
import * as MockDate from 'mockdate';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebsiteScanDataProvider,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanBatchRequest,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    PartitionKey,
    WebsiteScanData,
    WebsiteScanRef,
    ScanRunBatchRequest,
    ReportGroupRequest,
    ScanGroupType,
    ScanType,
    currentSchemaVersion,
    KnownPage,
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
let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;
let guidGeneratorMock: IMock<GuidGenerator>;
let context: Context;
let dateNow: Date;

const guid = 'guid-1';

beforeEach(() => {
    dateNow = new Date();
    MockDate.set(dateNow);

    onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);
    pageScanRequestProviderMock = Mock.ofType(PageScanRequestProvider);
    scanDataProviderMock = Mock.ofType(ScanDataProvider);
    partitionKeyFactoryMock = Mock.ofType(PartitionKeyFactory);
    serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
    loggerMock = Mock.ofType(MockableLogger);
    websiteScanDataProviderMock = Mock.ofType(WebsiteScanDataProvider);
    guidGeneratorMock = Mock.ofType<GuidGenerator>();
    context = <Context>(<unknown>{ bindingDefinitions: {} });

    guidGeneratorMock.setup((o) => o.createGuid()).returns(() => guid);

    scanBatchRequestFeedController = new ScanBatchRequestFeedController(
        onDemandPageScanRunResultProviderMock.object,
        pageScanRequestProviderMock.object,
        scanDataProviderMock.object,
        websiteScanDataProviderMock.object,
        partitionKeyFactoryMock.object,
        serviceConfigurationMock.object,
        guidGeneratorMock.object,
        loggerMock.object,
    );
});

afterEach(() => {
    MockDate.reset();

    onDemandPageScanRunResultProviderMock.verifyAll();
    pageScanRequestProviderMock.verifyAll();
    scanDataProviderMock.verifyAll();
    websiteScanDataProviderMock.verifyAll();
    partitionKeyFactoryMock.verifyAll();
    guidGeneratorMock.verifyAll();
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

    it.skip('should write complete request document', async () => {
        const documents = [
            {
                id: '1',
                partitionKey: 'pk-1',
                itemType: ItemType.scanRunBatchRequest,
                scanRunBatchRequest: [
                    {
                        schemaVersion: currentSchemaVersion,
                        scanId: 'scan-1',
                        url: 'http://url-1',
                        priority: 1,
                        scanType: 'accessibility',
                        deepScan: true,
                        scanNotifyUrl: 'url',
                        site: {
                            baseUrl: 'base-url-1',
                        },
                        reportGroups: [{ consolidatedId: 'consolidated-id-1' }],
                        privacyScan: { cookieBannerType: 'standard' },
                        authenticationType: 'entraId',
                    },
                ],
            },
        ] as OnDemandPageScanBatchRequest[];

        const websiteScans = setupWebsiteScanDataProviderMock(documents);
        setupOnDemandPageScanRunResultProviderMock(documents, websiteScans);
        setupPageScanRequestProviderMock(documents);
        setupScanDataProviderMock(documents);
        setupPartitionKeyFactoryMock(documents);

        await scanBatchRequestFeedController.invoke(context, documents);
    });

    it.each([
        {
            schemaVersion: currentSchemaVersion,
            scanId: 'scan-1',
            url: 'http://url-1',
            priority: 1,
            scanType: 'accessibility',
            scanNotifyUrl: 'reply-url-1',
            site: {
                baseUrl: 'base-url-1',
                knownPages: ['http://page1', 'http://page2'],
            },
            reportGroups: [{ consolidatedId: 'consolidated-id-1' }],
        },
        {
            schemaVersion: currentSchemaVersion,
            scanId: 'scan-2',
            url: 'http://url-2',
            priority: 0,
        },
        {
            url: 'http://url-3',
            error: 'error-3',
            priority: -3,
        },
        {
            schemaVersion: currentSchemaVersion,
            scanId: 'scan-4',
            url: 'http://url-4',
            priority: 1,
            scanNotifyUrl: 'reply-url-4',
            site: {
                baseUrl: 'base-url-4',
                knownPages: [
                    'http://url-4' /** should remove request URL */,
                    'http://page1',
                    'http://page2',
                    'http://page2',
                    'http://page3?b=1&a=1',
                    'http://page3?a=1&b=1',
                ] /** should remove duplicate URLs */,
                discoveryPatterns: ['pattern1'],
            },
            reportGroups: [{ consolidatedId: 'consolidated-id-2' }],
            deepScan: true,
        },
        {
            schemaVersion: currentSchemaVersion,
            scanId: 'scan-5',
            url: 'http://url-5',
            priority: 0,
            scanType: 'privacy',
            privacyScan: { cookieBannerType: 'standard' },
        },
    ] as ScanRunBatchRequest[])('should process scans request %s', async (request: ScanRunBatchRequest) => {
        const documents = [
            {
                id: '1',
                partitionKey: 'pk-1',
                itemType: ItemType.scanRunBatchRequest,
                scanRunBatchRequest: [{ ...request }],
            },
        ] as OnDemandPageScanBatchRequest[];

        const websiteScans = setupWebsiteScanDataProviderMock(documents);
        setupOnDemandPageScanRunResultProviderMock(documents, websiteScans);
        setupPageScanRequestProviderMock(documents);
        setupScanDataProviderMock(documents);
        setupPartitionKeyFactoryMock(documents);

        await scanBatchRequestFeedController.invoke(context, documents);
    });
});

function setupWebsiteScanDataProviderMock(documents: OnDemandPageScanBatchRequest[]): Partial<WebsiteScanData>[] {
    const websiteScans: Partial<WebsiteScanData>[] = [];
    documents.map((document) => {
        document.scanRunBatchRequest
            .filter((request: any) => request.error === undefined)
            .map((request) => {
                if (request.reportGroups === undefined) {
                    request.reportGroups = [{} as ReportGroupRequest];
                }

                let scanGroupType: ScanGroupType;
                if (request.deepScan === true) {
                    scanGroupType = 'deep-scan';
                } else if (request.reportGroups[0]?.consolidatedId || request.site?.knownPages?.length > 0) {
                    scanGroupType = 'consolidated-scan';
                } else {
                    scanGroupType = 'single-scan';
                }

                const knownPages = request.site?.knownPages
                    ? pullAllBy(uniqBy(request.site.knownPages, Url.normalizeUrl), [request.url], Url.normalizeUrl)
                    : undefined;

                const websiteScanData = {
                    baseUrl: request.site?.baseUrl,
                    scanGroupId: request.reportGroups[0]?.consolidatedId ?? guid,
                    deepScanId: scanGroupType !== 'single-scan' ? request.scanId : undefined,
                    scanGroupType,
                    knownPages: knownPages
                        ? (knownPages.map((url) => {
                              return { url };
                          }) as KnownPage[])
                        : ([] as KnownPage[]),
                    discoveryPatterns: request.site?.discoveryPatterns,
                    created: dateNow.toJSON(),
                } as WebsiteScanData;

                const documentId = `db-id-${websiteScanData.scanGroupId}`;
                const websiteScanDbDocument = { ...websiteScanData, id: documentId };
                websiteScans.push(websiteScanDbDocument);

                websiteScanDataProviderMock
                    .setup(async (o) => o.mergeOrCreate(It.isValue(websiteScanData)))
                    .returns(() => Promise.resolve(websiteScanDbDocument))
                    .verifiable();
            });
    });

    return websiteScans;
}

function setupOnDemandPageScanRunResultProviderMock(
    documents: OnDemandPageScanBatchRequest[],
    websiteScans: Partial<WebsiteScanData>[],
): void {
    let i = 0;
    documents.map((document) => {
        document.scanRunBatchRequest
            .filter((request) => request.scanId !== undefined)
            .map((request) => {
                const websiteScanRef = websiteScans.map((r) => {
                    return {
                        id: r.id,
                        scanGroupId: r.scanGroupId,
                        scanGroupType: r.scanGroupType,
                    } as WebsiteScanRef;
                })[i++];
                const result: OnDemandPageScanResult = {
                    schemaVersion: request.schemaVersion,
                    id: request.scanId,
                    url: request.url,
                    priority: request.priority,
                    itemType: ItemType.onDemandPageScanRunResult,
                    scanType: getScanType(request),
                    partitionKey: `pk-${request.scanId}`,
                    run: {
                        state: 'accepted',
                        timestamp: dateNow.toJSON(),
                    },
                    batchRequestId: document.id,
                    deepScanId: websiteScanRef.scanGroupType !== 'single-scan' ? request.deepScanId ?? request.scanId : undefined,
                    ...(isEmpty(request.scanNotifyUrl)
                        ? {}
                        : {
                              notification: {
                                  state: 'pending',
                                  scanNotifyUrl: request.scanNotifyUrl,
                              },
                          }),
                    websiteScanRef,
                    ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
                    ...(request.authenticationType === undefined ? {} : { authentication: { hint: request.authenticationType } }),
                };

                onDemandPageScanRunResultProviderMock.setup(async (o) => o.writeScanRuns(It.isValue([result]))).verifiable(Times.once());
            });
    });
}

function setupPageScanRequestProviderMock(documents: OnDemandPageScanBatchRequest[]): void {
    documents.map((document) => {
        document.scanRunBatchRequest
            .filter((batchRequest) => batchRequest.scanId !== undefined)
            .map((scanRequest) => {
                const scanGroupType = getScanGroupType(scanRequest);
                const request: OnDemandPageScanRequest = {
                    schemaVersion: scanRequest.schemaVersion,
                    id: scanRequest.scanId,
                    url: scanRequest.url,
                    priority: scanRequest.priority,
                    scanType: getScanType(scanRequest),
                    itemType: ItemType.onDemandPageScanRequest,
                    partitionKey: PartitionKey.pageScanRequestDocuments,
                    deepScan: scanRequest.deepScan,
                    deepScanId: scanGroupType !== 'single-scan' ? scanRequest.deepScanId ?? scanRequest.scanId : undefined,
                    ...(scanRequest.authenticationType === undefined ? {} : { authenticationType: scanRequest.authenticationType }),
                };

                if (!isNil(scanRequest.scanNotifyUrl)) {
                    request.scanNotifyUrl = scanRequest.scanNotifyUrl;
                }

                if (!isNil(scanRequest.site)) {
                    request.site = cloneDeep(scanRequest.site);
                    if (scanRequest.site.knownPages) {
                        request.site.knownPages = pullAllBy(
                            uniqBy(scanRequest.site.knownPages, Url.normalizeUrl),
                            [scanRequest.url],
                            Url.normalizeUrl,
                        );
                    }
                }

                if (!isEmpty(scanRequest.reportGroups)) {
                    request.reportGroups = scanRequest.reportGroups;
                }

                if (!isEmpty(scanRequest.privacyScan)) {
                    request.privacyScan = scanRequest.privacyScan;
                }

                pageScanRequestProviderMock.setup(async (o) => o.insertRequests(It.isValue([request]))).verifiable(Times.once());
            });
    });
}

function setupScanDataProviderMock(documents: OnDemandPageScanBatchRequest[]): void {
    documents.map((document) => {
        scanDataProviderMock
            .setup(async (o) =>
                o.deleteBatchRequest(
                    It.isObjectWith({ id: document.id, partitionKey: document.partitionKey } as OnDemandPageScanBatchRequest),
                ),
            )
            .verifiable(Times.once());
    });
}

function getScanGroupType(request: ScanRunBatchRequest): ScanGroupType {
    let consolidatedGroup;
    if (request.reportGroups !== undefined) {
        consolidatedGroup = request.reportGroups.find((g) => g.consolidatedId !== undefined);
    }

    if (request.deepScan === true) {
        return 'deep-scan';
    } else if (consolidatedGroup?.consolidatedId || request.site?.knownPages?.length > 0) {
        return 'consolidated-scan';
    } else {
        return 'single-scan';
    }
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

function getScanType(request: ScanRunBatchRequest): ScanType {
    return request.scanType ?? (request.privacyScan ? 'privacy' : 'accessibility');
}
