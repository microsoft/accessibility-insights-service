// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { filter, groupBy, isEmpty, pullAllBy, uniqBy } from 'lodash';
import { ContextAwareLogger, ScanRequestAcceptedMeasurements } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebController,
    WebsiteScanDataProvider,
} from 'service-library';
import {
    ItemType,
    KnownPage,
    OnDemandPageScanBatchRequest,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    PartitionKey,
    ReportGroupRequest,
    ScanGroupType,
    ScanRunBatchRequest,
    ScanType,
    WebsiteScanData,
} from 'storage-documents';
import pLimit from 'p-limit';

@injectable()
export class ScanBatchRequestFeedController extends WebController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'scan-batch-request-feed';

    private readonly maxConcurrencyLimit = 3;

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(WebsiteScanDataProvider) private readonly websiteScanDataProvider: WebsiteScanDataProvider,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger,
    ) {
        super(logger);
    }

    public async handleRequest(...args: unknown[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'scanBatchCosmosFeedTriggerFunc' });
        const limit = pLimit(this.maxConcurrencyLimit);

        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];
        await Promise.all(
            batchDocuments.map(async (batchDocument) =>
                limit(async () => {
                    const addedRequests = await this.processDocument(batchDocument);
                    const scanRequestAcceptedMeasurements: ScanRequestAcceptedMeasurements = {
                        acceptedScanRequests: addedRequests,
                    };
                    this.logger.trackEvent('ScanRequestAccepted', { batchRequestId: batchDocument.id }, scanRequestAcceptedMeasurements);
                    this.logger.logInfo(`The batch request DB document processed successfully.`, { batchRequestId: batchDocument.id });
                }),
            ),
        );
    }

    protected validateRequest(...args: unknown[]): boolean {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];

        return this.validateRequestData(batchDocuments);
    }

    private async processDocument(batchDocument: OnDemandPageScanBatchRequest): Promise<number> {
        const requests = batchDocument.scanRunBatchRequest.filter((request) => request.scanId !== undefined);
        if (requests.length > 0) {
            requests.forEach((request) => this.normalizeRequest(request, batchDocument.id));
            await this.writeRequestsToPermanentContainer(requests, batchDocument.id);
            await this.writeRequestsToQueueContainer(requests, batchDocument.id);
        }

        await this.deleteBatchRequest(batchDocument);

        return requests.length;
    }

    private async writeRequestsToPermanentContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            requests.map(async (request) =>
                limit(async () => {
                    const websiteScanData = await this.createWebsiteScanData(request, batchRequestId);
                    const websiteScanRef = {
                        id: websiteScanData.id,
                        scanGroupId: websiteScanData.scanGroupId,
                        scanGroupType: websiteScanData.scanGroupType,
                    };

                    const dbDocument: OnDemandPageScanResult = {
                        schemaVersion: '2',
                        id: request.scanId,
                        url: request.url,
                        priority: request.priority,
                        scanType: this.getScanType(request),
                        itemType: ItemType.onDemandPageScanRunResult,
                        batchRequestId: batchRequestId,
                        // Deep scan id refers to the initial scan request id.
                        // The deep scan id is passed on to child requests in scan request.
                        deepScanId: websiteScanRef.scanGroupType !== 'single-scan' ? request.deepScanId ?? request.scanId : undefined,
                        partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(
                            ItemType.onDemandPageScanRunResult,
                            request.scanId,
                        ),
                        websiteScanRef,
                        ...(request.authenticationType === undefined ? {} : { authentication: { hint: request.authenticationType } }),
                        run: {
                            state: 'accepted',
                            timestamp: new Date().toJSON(),
                        },
                        ...(isEmpty(request.scanNotifyUrl)
                            ? {}
                            : {
                                  notification: {
                                      state: 'pending',
                                      scanNotifyUrl: request.scanNotifyUrl,
                                  },
                              }),
                        ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
                    };

                    await this.onDemandPageScanRunResultProvider.writeScanRuns([dbDocument]);

                    this.logger.logInfo('Created scan result documents for batch request.', {
                        batchRequestId,
                        scanId: request.scanId,
                    });
                }),
            ),
        );
    }

    private async createWebsiteScanData(request: ScanRunBatchRequest, batchRequestId: string): Promise<WebsiteScanData> {
        const consolidatedGroup = this.getReportGroupRequest(request);
        const scanGroupType = this.getScanGroupType(request);
        const websiteScanData: Partial<WebsiteScanData> = {
            baseUrl: request.site?.baseUrl,
            scanGroupId: consolidatedGroup?.consolidatedId ?? this.guidGenerator.createGuid(),
            scanGroupType,
            // This value is immutable and is assigned when a new DB document is created
            deepScanId: scanGroupType !== 'single-scan' ? request.scanId : undefined,
            knownPages: request.site?.knownPages
                ? request.site.knownPages.map((url) => {
                      return { url };
                  })
                : [],
            discoveryPatterns: request.site?.discoveryPatterns?.length > 0 ? request.site.discoveryPatterns : undefined,
            // This value is assigned when a new DB document is created
            created: new Date().toJSON(),
        };
        websiteScanData.deepScanLimit = await this.getDeepScanLimit(websiteScanData);

        const dbDocument = await this.websiteScanDataProvider.mergeOrCreate(websiteScanData);

        this.logger.logInfo(`Created website document for batch request.`, {
            batchRequestId,
            scanId: request.scanId,
            websiteScanId: dbDocument.id,
        });

        return dbDocument;
    }

    private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            requests.map(async (request) =>
                limit(async () => {
                    const scanNotifyUrl = isEmpty(request.scanNotifyUrl) ? {} : { scanNotifyUrl: request.scanNotifyUrl };
                    const scanGroupType = this.getScanGroupType(request);

                    const dbDocument: OnDemandPageScanRequest = {
                        schemaVersion: '2',
                        id: request.scanId,
                        url: request.url,
                        priority: request.priority,
                        scanType: this.getScanType(request),
                        deepScan: request.deepScan,
                        // Deep scan id refers to the initial scan request id.
                        // The deep scan id is passed on to child requests in scan request.
                        deepScanId: scanGroupType !== 'single-scan' ? request.deepScanId ?? request.scanId : undefined,
                        itemType: ItemType.onDemandPageScanRequest,
                        partitionKey: PartitionKey.pageScanRequestDocuments,
                        ...(isEmpty(request.reportGroups) ? {} : { reportGroups: request.reportGroups }),
                        ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
                        ...(request.authenticationType === undefined ? {} : { authenticationType: request.authenticationType }),
                        ...scanNotifyUrl,
                        ...(isEmpty(request.site) ? {} : { site: request.site }),
                    };

                    await this.pageScanRequestProvider.insertRequests([dbDocument]);

                    this.logger.logInfo(`Created scan request document in queue storage container.`, {
                        batchRequestId,
                        scanId: request.scanId,
                    });
                }),
            ),
        );
    }

    private async deleteBatchRequest(batchDocument: OnDemandPageScanBatchRequest): Promise<void> {
        await this.scanDataProvider.deleteBatchRequest(batchDocument);
        this.logger.logInfo(`Finished deleting batch request DB documents.`, { batchRequestId: batchDocument.id });
    }

    private getScanGroupType(request: ScanRunBatchRequest): ScanGroupType {
        const consolidatedGroup = this.getReportGroupRequest(request);
        if (request.deepScan === true) {
            return 'deep-scan';
        } else if (consolidatedGroup?.consolidatedId || request.site?.knownPages?.length > 0) {
            return 'consolidated-scan';
        } else {
            return 'single-scan';
        }
    }

    private getReportGroupRequest(request: ScanRunBatchRequest): ReportGroupRequest {
        if (request.reportGroups !== undefined) {
            return request.reportGroups.find((g) => g.consolidatedId !== undefined);
        }

        return undefined;
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some((d) => d.itemType === ItemType.scanRunBatchRequest)) {
            this.logger.logWarn(`The batch request documents were not formatted correctly.`, { documents: JSON.stringify(documents) });

            return false;
        }

        return true;
    }

    private normalizeRequest(request: ScanRunBatchRequest, batchRequestId: string): void {
        // Normalize known pages
        if (request.site?.knownPages?.length > 0) {
            // Check for duplicate URLs
            const pages = [...request.site.knownPages, request.url];
            const duplicates = filter(
                groupBy(pages, (url) => Url.normalizeUrl(url)),
                (group) => group.length > 1,
            ).map((value) => value[0]);

            // Remove duplicate URLs
            if (duplicates.length > 0) {
                request.site.knownPages = pullAllBy(uniqBy(request.site.knownPages, Url.normalizeUrl), [request.url], Url.normalizeUrl);
                this.logger.logWarn('Removed duplicate URLs from the scan request.', {
                    batchRequestId,
                    scanId: request.scanId,
                    duplicates: JSON.stringify(duplicates),
                });
            }
        }
    }

    private getScanType(request: ScanRunBatchRequest): ScanType {
        return request.scanType ?? (request.privacyScan ? 'privacy' : 'accessibility');
    }

    // Gets deep scan limit based on request's know pages size
    private async getDeepScanLimit(websiteScanData: Partial<WebsiteScanData>): Promise<number> {
        const crawlConfig = await this.serviceConfig.getConfigValue('crawlConfig');
        const knownPagesLength = (websiteScanData.knownPages as KnownPage[]).length;
        if (knownPagesLength >= crawlConfig.deepScanDiscoveryLimit) {
            return knownPagesLength + 1 > crawlConfig.deepScanUpperLimit ? crawlConfig.deepScanUpperLimit : knownPagesLength + 1;
        } else {
            return crawlConfig.deepScanDiscoveryLimit;
        }
    }
}
