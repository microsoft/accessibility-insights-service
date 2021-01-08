// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, RestApiConfig, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { ContextAwareLogger, ScanRequestReceivedMeasurements } from 'logger';
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

        if (payload.length > this.config.maxScanRequestBatchCount) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.requestBodyTooLarge);
            this.logger.logError(`The HTTP request body is too large. The requests count: ${payload.length}.`);

            return;
        }
        const batchId = this.guidGenerator.createGuid();
        this.logger.setCommonProperties({ batchRequestId: batchId });

        const processedData = this.getProcessedRequestData(batchId, payload);
        await this.scanDataProvider.writeScanRunBatchRequest(batchId, processedData.scanRequestsToBeStoredInDb);
        this.context.res = {
            status: 202, // Accepted
            body: this.getResponse(processedData),
        };

        const totalUrls: number = processedData.scanResponses.length;
        const invalidUrls: number = processedData.scanResponses.filter((i) => i.error !== undefined).length;

        this.logger.logInfo('Accepted scan run batch request.', {
            batchId: batchId,
            totalUrls: totalUrls.toString(),
            invalidUrls: invalidUrls.toString(),
            scanRequestResponse: JSON.stringify(processedData.scanResponses),
        });

        const measurements: ScanRequestReceivedMeasurements = {
            totalScanRequests: totalUrls,
            pendingScanRequests: totalUrls - invalidUrls,
            rejectedScanRequests: invalidUrls,
        };

        this.logger.trackEvent('ScanRequestReceived', null, measurements);
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

        scanRunRequests.forEach((scanRunRequest) => {
            const runRequestValidationResult = this.validateRunRequest(scanRunRequest);
            if (runRequestValidationResult.valid) {
                // preserve GUID origin for a single batch scope
                const scanId = this.guidGenerator.createGuidFromBaseGuid(batchId);
                scanRequestsToBeStoredInDb.push({
                    scanId: scanId,
                    priority: isNil(scanRunRequest.priority) ? 0 : scanRunRequest.priority,
                    url: scanRunRequest.url,
                    ...(scanRunRequest.deepScan === undefined ? {} : { deepScan: scanRunRequest.deepScan }),
                    ...(isEmpty(scanRunRequest.scanNotifyUrl) ? {} : { scanNotifyUrl: scanRunRequest.scanNotifyUrl }),
                    ...(isEmpty(scanRunRequest.site) ? {} : { site: scanRunRequest.site }),
                    ...(isEmpty(scanRunRequest.reportGroups) ? {} : { reportGroups: scanRunRequest.reportGroups }),
                });

                scanResponses.push({
                    scanId: scanId,
                    url: scanRunRequest.url,
                });

                this.logger.logInfo('Generated new scan id for the scan request URL.', { batchId, scanId, url: scanRunRequest.url });
            } else {
                scanResponses.push({
                    url: scanRunRequest.url,
                    error: runRequestValidationResult.error,
                });
                this.logger.logInfo('The posted scan request URL is rejected as malformed.', { batchId, url: scanRunRequest.url });
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

        if (!isEmpty(scanRunRequest.scanNotifyUrl) && Url.tryParseUrlString(scanRunRequest.scanNotifyUrl) === undefined) {
            return { valid: false, error: WebApiErrorCodes.invalidScanNotifyUrl.error };
        }

        if (scanRunRequest.priority < this.config.minScanPriorityValue || scanRunRequest.priority > this.config.maxScanPriorityValue) {
            return { valid: false, error: WebApiErrorCodes.outOfRangePriority.error };
        }

        if (
            isEmpty(scanRunRequest.site?.baseUrl) !==
            (isEmpty(scanRunRequest.reportGroups) ||
                (scanRunRequest.reportGroups?.length > 0 ? scanRunRequest.reportGroups.some((g) => isEmpty(g?.consolidatedId)) : true))
        ) {
            return { valid: false, error: WebApiErrorCodes.missingSiteOrReportGroups.error };
        }

        const validReportGroup = scanRunRequest?.reportGroups?.find((g) => !isEmpty(g?.consolidatedId));
        if (scanRunRequest.deepScan && validReportGroup === undefined) {
            return { valid: false, error: WebApiErrorCodes.missingConsolidatedReportId.error };
        }

        return { valid: true };
    }

    private async init(): Promise<void> {
        this.config = await this.getRestApiConfig();
        this.logger.setCommonProperties({ source: 'postScanRequestRESTApi' });
    }
}
