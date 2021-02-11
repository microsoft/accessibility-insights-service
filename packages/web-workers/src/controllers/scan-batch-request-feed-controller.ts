// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ContextAwareLogger, ScanRequestAcceptedMeasurements } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebController,
    WebsiteScanResultProvider,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanBatchRequest,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    PartitionKey,
    ScanRunBatchRequest,
    WebsiteScanResult,
    WebsiteScanRef,
} from 'storage-documents';

interface ScanRequestTelemetryProperties {
    scanUrl: string;
    scanId: string;
}

interface BatchRequestFeedProcessTelemetryProperties {
    scanRequests: string;
    batchRequestId: string;
    [name: string]: string;
}

@injectable()
export class ScanBatchRequestFeedController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'scan-batch-request-feed';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
    ) {
        super(logger);
    }

    public async handleRequest(...args: unknown[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'scanBatchCosmosFeedTriggerFunc' });
        this.logger.logInfo('Processing the scan batch documents.');

        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];
        await Promise.all(
            batchDocuments.map(async (document) => {
                const addedRequests = await this.processDocument(document);
                const scanRequestAcceptedMeasurements: ScanRequestAcceptedMeasurements = {
                    acceptedScanRequests: addedRequests,
                };
                this.logger.trackEvent('ScanRequestAccepted', { batchRequestId: document.id }, scanRequestAcceptedMeasurements);

                this.logger.logInfo(
                    `The batch request document processed successfully.`,
                    this.getLogPropertiesForRequests(document.scanRunBatchRequest, document.id),
                );
            }),
        );

        this.logger.logInfo('The scan batch documents processed successfully.');
    }

    protected validateRequest(...args: unknown[]): boolean {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];

        return this.validateRequestData(batchDocuments);
    }

    private async processDocument(batchDocument: OnDemandPageScanBatchRequest): Promise<number> {
        const requests = batchDocument.scanRunBatchRequest.filter((request) => request.scanId !== undefined);
        if (requests.length > 0) {
            await this.writeRequestsToPermanentContainer(requests, batchDocument.id);
            await this.writeRequestsToQueueContainer(requests, batchDocument.id);

            await this.scanDataProvider.deleteBatchRequest(batchDocument);
            this.logger.logInfo(
                `The batch request document deleted from inbound storage container.`,
                this.getLogPropertiesForRequests(requests, batchDocument.id),
            );
        }

        return requests.length;
    }

    private async writeRequestsToPermanentContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const websiteScanResults: WebsiteScanResult[] = [];
        const requestDocuments = requests.map<OnDemandPageScanResult>((request) => {
            this.logger.logInfo('Created new scan result document in scan result storage container.', {
                batchRequestId,
                scanId: request.scanId,
            });

            let websiteScanRefs: WebsiteScanRef;
            const websiteScanResult = this.createWebsiteScanResult(request);
            if (websiteScanResult) {
                websiteScanRefs = { id: websiteScanResult.id, scanGroupType: websiteScanResult.scanGroupType };
                websiteScanResults.push(websiteScanResult);
                this.logger.logInfo('Referenced website scan result document to the new scan result document.', {
                    batchRequestId,
                    scanId: request.scanId,
                    websiteScanId: websiteScanResult.id,
                    scanGroupId: websiteScanResult.scanGroupId,
                    scanGroupType: websiteScanResult.scanGroupType,
                });
            }

            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                itemType: ItemType.onDemandPageScanRunResult,
                partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, request.scanId),
                run: {
                    state: 'accepted',
                    timestamp: new Date().toJSON(),
                },
                batchRequestId: batchRequestId,
                ...(isEmpty(request.scanNotifyUrl)
                    ? {}
                    : {
                          notification: {
                              state: 'pending',
                              scanNotifyUrl: request.scanNotifyUrl,
                          },
                      }),
                websiteScanRefs: websiteScanRefs ? [websiteScanRefs] : undefined,
            };
        });

        if (websiteScanResults.length > 0) {
            await this.websiteScanResultProvider.mergeOrCreateBatch(websiteScanResults);
        }

        await this.onDemandPageScanRunResultProvider.writeScanRuns(requestDocuments);
        this.logger.logInfo(
            `Added scan requests to permanent scan result storage container.`,
            this.getLogPropertiesForRequests(requests, batchRequestId),
        );
    }

    private createWebsiteScanResult(request: ScanRunBatchRequest): WebsiteScanResult {
        if (request.reportGroups !== undefined) {
            const consolidatedGroup = request.reportGroups.find((group) => group.consolidatedId !== undefined);
            if (consolidatedGroup) {
                const websiteScanRequest: Partial<WebsiteScanResult> = {
                    baseUrl: request.site.baseUrl,
                    scanGroupId: consolidatedGroup.consolidatedId,
                    // the deep scan id will be saved only when new db document is created
                    deepScanId: request.deepScan ? request.scanId : undefined,
                    scanGroupType: request.deepScan ? 'deep-scan' : 'consolidated-scan-report',
                    pageScans: [
                        {
                            scanId: request.scanId,
                            url: request.url,
                            timestamp: new Date().toJSON(),
                        },
                    ],
                    knownPages: request.site.knownPages,
                    discoveryPatterns: request.site.discoveryPatterns,
                };

                return this.websiteScanResultProvider.normalizeToDbDocument(websiteScanRequest);
            }
        }

        return undefined;
    }

    private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanRequest>((request) => {
            const scanNotifyUrl = isEmpty(request.scanNotifyUrl) ? {} : { scanNotifyUrl: request.scanNotifyUrl };
            this.logger.logInfo('Created new scan request document in queue storage container.', {
                batchRequestId,
                scanId: request.scanId,
            });

            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                deepScan: request.deepScan,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
                ...scanNotifyUrl,
                ...(isEmpty(request.site) ? {} : { site: request.site }),
                ...(isEmpty(request.reportGroups) ? {} : { reportGroups: request.reportGroups }),
            };
        });

        await this.pageScanRequestProvider.insertRequests(requestDocuments);
        this.logger.logInfo(
            `Added scan requests to scan queue storage container.`,
            this.getLogPropertiesForRequests(requests, batchRequestId),
        );
    }

    private getLogPropertiesForRequests(
        requests: ScanRunBatchRequest[],
        batchRequestId: string,
    ): BatchRequestFeedProcessTelemetryProperties {
        return {
            scanRequests: JSON.stringify(
                requests.map((r) => {
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    return {
                        scanId: r.scanId,
                        scanUrl: r.url,
                    } as ScanRequestTelemetryProperties;
                }),
            ),
            batchRequestId,
        };
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some((d) => d.itemType === ItemType.scanRunBatchRequest)) {
            this.logger.logInfo(`The scan batch documents were malformed.`, { documents: JSON.stringify(documents) });

            return false;
        }

        return true;
    }
}
