// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';

import { webApiIocTypes } from '../setup-ioc-container';
import { ApiController } from './api-controller';

@injectable()
export class ScanResultController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'get-scan';

    public constructor(
        @inject(webApiIocTypes.azureFunctionContext) protected readonly context: Context,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        const scanId = <string>this.context.bindingData.scanId;
        const timeRequested = this.guidGenerator.getGuidTimestamp(scanId);
        const timeCurrent = new Date();
        const scanResultQueryBufferInSeconds = (await this.getRestApiConfig()).scanResultQueryBufferInSeconds;

        if (timeCurrent.getTime() - timeRequested.getTime() <= scanResultQueryBufferInSeconds * 1000) {
            // user made the scan result query too soon after the scan request, will return a default response.
            this.context.res = {
                status: 202, // Accepted
                body: this.getDefaultResponse(scanId),
            };
            this.logger.logInfo('scan result queried too soon', { scanId });

            return;
        }

        const scanResultItems = await this.onDemandPageScanRunResultProvider.readScanRuns([scanId]);

        if (scanResultItems.length !== 1) {
            // scan result not found
            this.context.res = {
                status: 404,
                body: this.getUnknownResponse(scanId),
            };
            this.logger.logInfo('scan result not found', { scanId });
        } else {
            this.context.res = {
                status: 200,
                body: scanResultItems[0],
            };

            this.logger.logInfo('scan result fetched', { scanId });
        }
    }

    private getDefaultResponse(scanId: string): OnDemandPageScanResult {
        return {
            id: scanId,
            partitionKey: undefined,
            url: undefined,
            run: {
                state: 'accepted',
            },
            priority: undefined,
            itemType: ItemType.onDemandPageScanRunResult,
        };
    }

    private getUnknownResponse(scanId: string): OnDemandPageScanResult {
        return {
            id: scanId,
            partitionKey: undefined,
            url: undefined,
            run: {
                state: 'unknown',
            },
            priority: undefined,
            itemType: ItemType.onDemandPageScanRunResult,
        };
    }
}
