// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, RestApiConfig, ServiceConfiguration, Url, CrawlConfig } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty, isNil, groupBy, filter, isArray } from 'lodash';
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

    private restApiConfig: RestApiConfig;

    private crawlConfig: CrawlConfig;

    public constructor(
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger,
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

        if (payload.length > this.restApiConfig.maxScanRequestBatchCount) {
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
            const singularRequest: ScanRunRequest = this.tryGetPayload<ScanRunRequest>();
            if (Array.isArray(singularRequest)) {
                throw new Error('Malformed HTTP request body.');
            }
            payload = [singularRequest];
        } else {
            payload = this.tryGetPayload<ScanRunRequest[]>();
        }

        return payload;
    }

    private getProcessedRequestData(batchId: string, scanRunRequests: ScanRunRequest[]): ProcessedBatchRequestData {
        const scanRequestsToBeStoredInDb: ScanRunBatchRequest[] = [];
        const scanResponses: ScanRunResponse[] = [];

        const batchRequestValidationResult = this.validateBatchRequest(scanRunRequests);
        if (batchRequestValidationResult.valid !== true) {
            scanResponses.push({
                url: undefined,
                error: batchRequestValidationResult.error,
            });
            this.logger.logInfo('The scan batch request is rejected as malformed.', {
                batchId,
                jsonRequest: JSON.stringify(scanRunRequests),
            });

            return {
                scanRequestsToBeStoredInDb: [],
                scanResponses,
            };
        }

        scanRunRequests.forEach((scanRunRequest) => {
            const runRequestValidationResult = this.validateRunRequest(scanRunRequest);
            if (runRequestValidationResult.valid) {
                // preserve GUID origin for a single batch scope
                const scanId = this.guidGenerator.createGuidFromBaseGuid(batchId);
                scanRequestsToBeStoredInDb.push({
                    scanId: scanId,
                    url: scanRunRequest.url,
                    priority: isNil(scanRunRequest.priority) ? 0 : scanRunRequest.priority,
                    ...(scanRunRequest.deepScan === undefined ? {} : { deepScan: scanRunRequest.deepScan }),
                    ...(scanRunRequest.authenticationType === undefined ? {} : { authenticationType: scanRunRequest.authenticationType }),
                    ...(scanRunRequest.privacyScan === undefined ? {} : { privacyScan: scanRunRequest.privacyScan }),
                    ...(isEmpty(scanRunRequest.reportGroups) ? {} : { reportGroups: scanRunRequest.reportGroups }),
                    ...(isEmpty(scanRunRequest.site) ? {} : { site: scanRunRequest.site }),
                    ...(isEmpty(scanRunRequest.scanNotifyUrl) ? {} : { scanNotifyUrl: scanRunRequest.scanNotifyUrl }),
                });

                scanResponses.push({
                    scanId: scanId,
                    url: scanRunRequest.url,
                });

                this.logger.logInfo('Generated new scan id for the scan request.', {
                    batchId,
                    scanId,
                    url: scanRunRequest.url,
                    jsonRequest: JSON.stringify(scanRunRequest),
                });
            } else {
                scanResponses.push({
                    url: scanRunRequest.url,
                    error: runRequestValidationResult.error,
                });
                this.logger.logInfo('The scan request is rejected as malformed.', {
                    batchId,
                    url: scanRunRequest.url,
                    jsonRequest: JSON.stringify(scanRunRequest),
                });
            }
        });

        return {
            scanRequestsToBeStoredInDb,
            scanResponses,
        };
    }

    private validateBatchRequest(scanRunRequests: ScanRunRequest[]): RunRequestValidationResult {
        if (isEmpty(scanRunRequests) || !isArray(scanRunRequests) || scanRunRequests.length === 0) {
            return { valid: false, error: WebApiErrorCodes.malformedRequest.error };
        }

        return { valid: true };
    }

    private validateRunRequest(scanRunRequest: ScanRunRequest): RunRequestValidationResult {
        if (Url.tryParseUrlString(scanRunRequest.url) === undefined) {
            return { valid: false, error: WebApiErrorCodes.invalidURL.error };
        }

        if (!isEmpty(scanRunRequest.scanNotifyUrl) && Url.tryParseUrlString(scanRunRequest.scanNotifyUrl) === undefined) {
            return { valid: false, error: WebApiErrorCodes.invalidScanNotifyUrl.error };
        }

        if (
            scanRunRequest.priority < this.restApiConfig.minScanPriorityValue ||
            scanRunRequest.priority > this.restApiConfig.maxScanPriorityValue
        ) {
            return { valid: false, error: WebApiErrorCodes.outOfRangePriority.error };
        }

        if (scanRunRequest.deepScan && isEmpty(scanRunRequest.site?.baseUrl)) {
            return { valid: false, error: WebApiErrorCodes.missingRequiredDeepScanProperties.error };
        }

        const invalidReportGroup = scanRunRequest.reportGroups && scanRunRequest.reportGroups.some((g) => isEmpty(g?.consolidatedId));
        if (invalidReportGroup) {
            return { valid: false, error: WebApiErrorCodes.invalidReportGroup.error };
        }

        if (scanRunRequest.site?.baseUrl && Url.tryParseUrlString(scanRunRequest.site.baseUrl) === undefined) {
            return { valid: false, error: WebApiErrorCodes.invalidURL.error };
        }

        if (scanRunRequest.site?.knownPages?.length > this.crawlConfig.deepScanUpperLimit) {
            return { valid: false, error: WebApiErrorCodes.tooManyKnownPages.error };
        }

        if (scanRunRequest.site?.knownPages?.length > 0) {
            if (scanRunRequest.site.knownPages.some((url) => Url.tryParseUrlString(url) === undefined)) {
                return { valid: false, error: WebApiErrorCodes.invalidKnownPageURL.error };
            }
        }

        if (scanRunRequest.site?.knownPages?.length > 0) {
            const pages = [...scanRunRequest.site.knownPages, scanRunRequest.url];
            const duplicates = filter(
                groupBy(pages, (url) => Url.normalizeUrl(url)),
                (group) => group.length > 1,
            ).map((value) => value[0]);

            if (duplicates.length > 0) {
                this.logger.logWarn('Found duplicate URLs in a client request.', { duplicates: JSON.stringify(duplicates) });

                // return { valid: false, error: WebApiErrorCodes.duplicateKnownPage.error };
            }
        }

        return { valid: true };
    }

    private async init(): Promise<void> {
        this.restApiConfig = await this.getRestApiConfig();
        this.crawlConfig = await this.serviceConfig.getConfigValue('crawlConfig');
        this.logger.setCommonProperties({ source: 'postScanRequestRESTApi' });
    }
}
