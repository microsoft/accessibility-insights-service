// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { Logger } from 'logger';
import { ApiController, HttpResponse, WebApiErrorCodes } from 'service-library';
import { ScanRunBatchRequest } from 'storage-documents';
import { ScanRunRequest } from '../api-contracts/scan-run-request';
import { ScanRunResponse } from '../api-contracts/scan-run-response';
import { ScanDataProvider } from '../providers/scan-data-provider';

@injectable()
export class ScanRequestController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-post-scans';

    public constructor(
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const payload = this.tryGetPayload<ScanRunRequest[]>();
        const maxLength = (await this.getRestApiConfig()).maxScanRequestBatchCount;
        if (payload.length > maxLength) {
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
            if (Url.tryParseUrlString(scanRunRequest.url) !== undefined) {
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
                    error: WebApiErrorCodes.invalidURL.error,
                });
            }
        });

        return {
            scanRequestsToBeStoredInDb: scanRequestsToBeStoredInDb,
            scanResponses: scanResponses,
        };
    }
}

interface ProcessedBatchRequestData {
    scanRequestsToBeStoredInDb: ScanRunBatchRequest[];
    scanResponses: ScanRunResponse[];
}
