// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { GuidUtils, RestApiConfig, ServiceConfiguration, Url } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ScanRunRequest } from '../api-contracts/scan-run-request';
import { ScanRunResponse } from '../api-contracts/scan-run-response';
import { ScanDataProvider } from '../providers/scan-data-provider';
import { webApiIocTypes } from '../setup-ioc-container';
import { ApiController } from './api-controller';

@injectable()
export class ScanRequestController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'post-scans';

    public constructor(
        @inject(webApiIocTypes.azureFunctionContext) protected readonly context: Context,
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(GuidUtils) private readonly guidUtils: GuidUtils,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const payload = this.tryGetPayload<ScanRunRequest[]>();
        if (payload === undefined) {
            return;
        }

        const maxLength = (await this.getRestApiConfig()).maxScanRequestBatchCount;
        if (payload.length > maxLength) {
            this.context.res = {
                status: 413, // Payload Too Large
                body: 'Request size is too large',
            };

            return;
        }

        const batchId = this.guidUtils.createGuid();
        const response = this.createScanRunBatchResponse(batchId, payload);

        await this.scanDataProvider.writeScanRunBatchRequest(batchId, response);

        this.context.res = {
            status: 202, // Accepted
            body: response,
        };

        this.logger.logInfo('Accepted scan run batch request', {
            batchId: batchId,
            totalUrls: response.length.toString(),
            invalidUrls: response.filter(i => i.error !== undefined).length.toString(),
        });
    }

    private createScanRunBatchResponse(batchId: string, scanRunRequests: ScanRunRequest[]): ScanRunResponse[] {
        return scanRunRequests.map(scanRunRequest => {
            if (Url.tryParseUrlString(scanRunRequest.url) !== undefined) {
                return {
                    // preserve guid origin for a single batch scope
                    scanId: this.guidUtils.createGuidForNode(batchId),
                    url: scanRunRequest.url,
                };
            } else {
                return {
                    url: scanRunRequest.url,
                    error: 'Invalid URL',
                };
            }
        });
    }

    private async getRestApiConfig(): Promise<RestApiConfig> {
        return this.serviceConfig.getConfigValue('restApiConfig');
    }
}
