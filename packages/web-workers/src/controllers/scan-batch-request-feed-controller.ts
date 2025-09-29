// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { filter, groupBy, isEmpty, pullAllBy, uniqBy } from 'lodash';
import { GlobalLogger, ScanRequestAcceptedMeasurements } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebApiErrorCode,
    WebApiErrorCodes,
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
    ScanRunDetail,
    ScanType,
    WebsiteScanData,
} from 'storage-documents';
import pLimit from 'p-limit';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
        @inject(GlobalLogger) protected readonly logger: GlobalLogger,
    ) {
        super(logger);
    }

    public async handleRequest(...args: any[]): Promise<void> {
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

    protected async validateRequest(...args: any[]): Promise<WebApiErrorCode> {
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
                    const scanDefinitionsRunState: ScanRunDetail[] = request.scanDefinitions?.map((scanDefinition) => {
                        return {
                            name: scanDefinition.name,
                            state: 'pending',
                            timestamp: new Date().toJSON(),
                        };
                    });
                    const dbDocument: OnDemandPageScanResult = {
                        schemaVersion: '2',
                        id: request.scanId,
                        url: request.url,
                        priority: request.priority,
                        scanType: this.getScanType(request),
                        itemType: ItemType.onDemandPageScanRunResult,
                        batchRequestId: batchRequestId,
                        deepScanId: this.getDeepScanId(request),
                        partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(
                            ItemType.onDemandPageScanRunResult,
                            request.scanId,
                        ),
                        websiteScanRef,
                        ...(request.scanDefinitions === undefined ? {} : { scanDefinitions: request.scanDefinitions }),
                        ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
                        ...(request.authenticationType === undefined ? {} : { authentication: { hint: request.authenticationType } }),
                        run: {
                            state: 'accepted',
                            timestamp: new Date().toJSON(),
                            scanRunDetails: scanDefinitionsRunState ?? [],
                        },
                    };

                    await this.onDemandPageScanRunResultProvider.writeScanRuns([dbDocument]);

                    this.logger.logInfo('Created scan result documents for request.', {
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
            deepScanId: this.getDeepScanId(request),
            knownPages: request.site?.knownPages
                ? request.site.knownPages.map((url) => {
                      return { url, source: 'request' } as KnownPage;
                  })
                : [],
            discoveryPatterns: request.site?.discoveryPatterns?.length > 0 ? request.site.discoveryPatterns : undefined,
            created: new Date().toJSON(),
        };
        websiteScanData.deepScanLimit = await this.getDeepScanLimit(websiteScanData);

        // The website document is created only once for each scan request
        const dbDocument = await this.websiteScanDataProvider.create(websiteScanData);

        this.logger.logInfo(`Created website document for request.`, {
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
                    const dbDocument: OnDemandPageScanRequest = {
                        schemaVersion: '2',
                        id: request.scanId,
                        url: request.url,
                        priority: request.priority,
                        scanType: this.getScanType(request),
                        deepScan: request.deepScan,
                        deepScanId: this.getDeepScanId(request),
                        itemType: ItemType.onDemandPageScanRequest,
                        partitionKey: PartitionKey.pageScanRequestDocuments,
                        ...(isEmpty(request.reportGroups) ? {} : { reportGroups: request.reportGroups }),
                        ...(request.scanDefinitions === undefined ? {} : { scanDefinitions: request.scanDefinitions }),
                        ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
                        ...(request.authenticationType === undefined ? {} : { authenticationType: request.authenticationType }),
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
        if (request.deepScan === true) {
            return 'deep-scan';
        } else if (request.site?.knownPages?.length > 0) {
            return 'group-scan';
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

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): WebApiErrorCode {
        if (documents === undefined || documents.length === 0 || !documents.some((d) => d.itemType === ItemType.scanRunBatchRequest)) {
            this.logger.logWarn(`The batch request documents were not formatted correctly.`, { documents: JSON.stringify(documents) });

            return WebApiErrorCodes.malformedRequest;
        }

        return undefined;
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

    private getDeepScanId(request: ScanRunBatchRequest): string {
        // The initial scan request id is deep scan id. The deep scan id is passed on to subsequent scan requests.
        return request.deepScanId ?? request.scanId;
    }

    private getScanType(request: ScanRunBatchRequest): ScanType {
        if (!isEmpty(request.scanType)) {
            return request.scanType;
        }

        return 'privacy';
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
