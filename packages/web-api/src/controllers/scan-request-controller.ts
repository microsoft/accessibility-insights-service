// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, RestApiConfig, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { BatchScanRequestMeasurements, ContextAwareLogger, Logger } from 'logger';
import {
    ApiController,
    HttpResponse,
    ScanDataProvider,
    ScanRunRequest,
    ScanRunResponse,
    WebApiError,
    WebApiErrorCodes,
} from 'service-library';
import { ScanRunBatchRequest } from 'storage-documents';

// tslint:disable: no-any
type DictionaryStringToNumber = { [name: string]: number };

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
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
    ) {
        super(contextAwareLogger);
    }

    public async handleRequest(): Promise<void> {
        await this.init();

        const payload = this.tryGetPayload<ScanRunRequest[]>();
        if (payload.length > this.config.maxScanRequestBatchCount) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.requestBodyTooLarge);

            return;
        }

        const batchId = this.guidGenerator.createGuid();
        const processedData = this.getProcessedRequestData(batchId, payload);
        await this.scanDataProvider.writeScanRunBatchRequest(batchId, processedData.scanRequestsToBeStoredInDb);
        this.context.res = {
            status: 202, // Accepted
            body: processedData.scanResponses,
        };

        const totalUrls: number = processedData.scanResponses.length;
        const invalidUrls: number = processedData.scanResponses.filter(i => i.error !== undefined).length;

        this.contextAwareLogger.setCustomProperties({ batchRequestId: batchId });
        this.contextAwareLogger.logInfo('Accepted scan run batch request', {
            batchId: batchId,
            totalUrls: totalUrls.toString(),
            invalidUrls: invalidUrls.toString(),
        });

        const measurements: BatchScanRequestMeasurements = {
            totalScanRequests: totalUrls,
            acceptedScanRequests: totalUrls - invalidUrls,
            rejectedScanRequests: invalidUrls,
        };

        // tslint:disable-next-line: no-null-keyword
        this.contextAwareLogger.trackEvent('BatchScanRequestSubmitted', null, measurements);
    }

    private getProcessedRequestData(batchId: string, scanRunRequests: ScanRunRequest[]): ProcessedBatchRequestData {
        const scanRequestsToBeStoredInDb: ScanRunBatchRequest[] = [];
        const scanResponses: ScanRunResponse[] = [];

        scanRunRequests.forEach(scanRunRequest => {
            const runRequestValidationResult = this.validateRunRequest(scanRunRequest);
            if (runRequestValidationResult.valid) {
                // preserve GUID origin for a single batch scope
                const scanId = this.guidGenerator.createGuidFromBaseGuid(batchId);
                scanRequestsToBeStoredInDb.push({
                    scanId: scanId,
                    priority: isNil(scanRunRequest.priority) ? 0 : scanRunRequest.priority,
                    url: scanRunRequest.url,
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
        });

        return {
            scanRequestsToBeStoredInDb: scanRequestsToBeStoredInDb,
            scanResponses: scanResponses,
        };
    }

    private validateRunRequest(scanRunRequest: ScanRunRequest): RunRequestValidationResult {
        if (Url.tryParseUrlString(scanRunRequest.url) === undefined) {
            return { valid: false, error: WebApiErrorCodes.invalidURL.error };
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
