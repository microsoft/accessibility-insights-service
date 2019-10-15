// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, RestApiConfig, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { Logger } from 'logger';
import { ApiController, HttpResponse, ScanDataProvider, WebApiError, WebApiErrorCodes } from 'service-library';
import { ScanRunBatchRequest } from 'storage-documents';
import { ScanRunRequest } from '../api-contracts/scan-run-request';
import { ScanRunResponse } from '../api-contracts/scan-run-response';

// tslint:disable: no-any

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
        @inject(Logger) private readonly logger: Logger,
    ) {
        super();
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

        this.logger.logInfo('Accepted scan run batch request', {
            batchId: batchId,
            totalUrls: processedData.scanResponses.length.toString(),
            invalidUrls: processedData.scanResponses.filter(i => i.error !== undefined).length.toString(),
        });
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
