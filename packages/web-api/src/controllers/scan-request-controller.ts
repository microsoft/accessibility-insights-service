// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { RestApiConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ScanRunRequest } from '../api-contracts/scan-run-request';
import { webApiIocTypes } from '../setupIoContainer';
import { ApiController } from './api-controller';

@injectable()
export class ScanRequestController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-post-scans';

    public constructor(
        @inject(webApiIocTypes.azureFunctionContext) protected readonly context: Context,
        @inject(cosmosContainerClientTypes.ScanBatchesCosmosContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const payload = this.tryGetPayload<ScanRunRequest[]>();
        if (payload === undefined) {
            this.context.res = {
                status: 400, // Bad Request
                body: 'Invalid request syntax',
            };

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
    }

    private async getRestApiConfig(): Promise<RestApiConfig> {
        return this.serviceConfig.getConfigValue('restApiConfig');
    }
}
