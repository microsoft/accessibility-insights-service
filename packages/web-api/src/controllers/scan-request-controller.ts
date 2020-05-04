// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, RestApiConfig, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { BatchScanRequestMeasurements, ContextAwareLogger } from 'logger';
import {
    ApiController,
    HttpResponse,
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanRunRequest,
    ScanRunResponse,
    WebApiError,
    WebApiErrorCodes,
} from 'service-library';
import { ItemType, OnDemandPageScanRequest, OnDemandPageScanResult, PartitionKey, ScanRunBatchRequest } from 'storage-documents';

interface ProcessedBatchRequestData {
    scanRequestsToBeStoredInDb: ScanRunBatchRequest[];
    scanResponses: ScanRunResponse[];
}

interface RunRequestValidationResult {
    valid: boolean;
    error?: WebApiError;
}

@injectable()
export class ScanRequestController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-post-scans';
    private config: RestApiConfig;

    public constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        await this.init();
        let payload: ScanRunRequest[];
        try {
            payload = this.extractPayload();
        } catch (e) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.malformedRequest);

            return;
        }

        if (payload.length > 1) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.requestBodyTooLarge);

            return;
        }
        const batchId = this.guidGenerator.createGuid();
        const processedData = this.getProcessedRequestData(batchId, payload);

        await this.writeRequestsToPermanentContainer(processedData.scanRequestsToBeStoredInDb, batchId);
        await this.writeRequestsToQueueContainer(processedData.scanRequestsToBeStoredInDb);

        this.context.res = {
            status: 202, // Accepted
            body: this.getResponse(processedData),
        };

        const totalUrls: number = processedData.scanResponses.length;
        const invalidUrls: number = processedData.scanResponses.filter((i) => i.error !== undefined).length;

        this.logger.setCustomProperties({ batchRequestId: batchId });
        this.logger.logInfo('Accepted scan run batch request', {
            batchId: batchId,
            totalUrls: totalUrls.toString(),
            invalidUrls: invalidUrls.toString(),
            scanRequestResponse: JSON.stringify(processedData.scanResponses),
        });

        const measurements: BatchScanRequestMeasurements = {
            totalScanRequests: totalUrls,
            acceptedScanRequests: totalUrls - invalidUrls,
            rejectedScanRequests: invalidUrls,
        };

        // tslint:disable-next-line: no-null-keyword
        this.logger.trackEvent('BatchScanRequestSubmitted', null, measurements);
    }

    private async writeRequestsToPermanentContainer(requests: ScanRunBatchRequest[], batchRequestId: string): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanResult>((request) => {
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
            };
        });

        if (requestDocuments.length > 0) {
            await this.onDemandPageScanRunResultProvider.writeScanRuns(requestDocuments);
            this.logger.logInfo(`[ScanRequestController] Added requests to permanent container`);
        }
    }

    private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[]): Promise<void> {
        const requestDocuments = requests.map<OnDemandPageScanRequest>((request) => {
            const scanNotifyUrl = isEmpty(request.scanNotifyUrl) ? {} : { scanNotifyUrl: request.scanNotifyUrl };

            return {
                id: request.scanId,
                url: request.url,
                priority: request.priority,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
                ...scanNotifyUrl,
            };
        });

        if (requestDocuments.length > 0) {
            await this.pageScanRequestProvider.insertRequests(requestDocuments);
            this.logger.logInfo(`[ScanRequestController] Added requests to queue container`);
        }
    }

    private getResponse(processedData: ProcessedBatchRequestData): ScanRunResponse | ScanRunResponse[] {
        const isV2 = this.context.req.query['api-version'] === '2.0' ? true : false;
        let response;
        if (isV2) {
            response = processedData.scanResponses.find((x) => x !== undefined);
        } else {
            response = processedData.scanResponses;
        }

        return response;
    }

    private extractPayload(): ScanRunRequest[] {
        const isV2 = this.context.req.query['api-version'] === '2.0';
        let payload: ScanRunRequest[];
        if (isV2) {
            const singularReq: ScanRunRequest = this.tryGetPayload<ScanRunRequest>();
            if (Array.isArray(singularReq)) {
                throw new Error('Malformed request body');
            }
            payload = [singularReq];
        } else {
            payload = this.tryGetPayload<ScanRunRequest[]>();
        }

        return payload;
    }

    private getProcessedRequestData(batchId: string, scanRunRequests: ScanRunRequest[]): ProcessedBatchRequestData {
        const scanRequestsToBeStoredInDb: ScanRunBatchRequest[] = [];
        const scanResponses: ScanRunResponse[] = [];

        if (scanRunRequests.length > 0) {
            const scanRunRequest = scanRunRequests[0];
            const runRequestValidationResult = this.validateRunRequest(scanRunRequest);
            if (runRequestValidationResult.valid) {
                // preserve GUID origin for a single batch scope
                const scanId = this.guidGenerator.createGuidFromBaseGuid(batchId);
                scanRequestsToBeStoredInDb.push({
                    scanId: scanId,
                    priority: isNil(scanRunRequest.priority) ? 0 : scanRunRequest.priority,
                    url: scanRunRequest.url,
                    ...(isEmpty(scanRunRequest.scanNotifyUrl) ? {} : { scanNotifyUrl: scanRunRequest.scanNotifyUrl }),
                });

                scanResponses.push({
                    scanId: scanId,
                    url: scanRunRequest.url,
                });
            } else {
                scanResponses.push({
                    url: scanRunRequest.url,
                    error: runRequestValidationResult.error,
                });
            }
        }

        return {
            scanRequestsToBeStoredInDb: scanRequestsToBeStoredInDb,
            scanResponses: scanResponses,
        };
    }

    private validateRunRequest(scanRunRequest: ScanRunRequest): RunRequestValidationResult {
        if (Url.tryParseUrlString(scanRunRequest.url) === undefined) {
            return { valid: false, error: WebApiErrorCodes.invalidURL.error };
        }

        if (!isEmpty(scanRunRequest.scanNotifyUrl) && Url.tryParseUrlString(scanRunRequest.scanNotifyUrl) === undefined) {
            return { valid: false, error: WebApiErrorCodes.invalidScanNotifyUrl.error };
        }

        if (scanRunRequest.priority < this.config.minScanPriorityValue || scanRunRequest.priority > this.config.maxScanPriorityValue) {
            return { valid: false, error: WebApiErrorCodes.outOfRangePriority.error };
        }

        return { valid: true };
    }

    private async init(): Promise<void> {
        this.config = await this.getRestApiConfig();
    }
}
