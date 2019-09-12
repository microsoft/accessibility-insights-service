// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { ScanBatchRequest } from '../api-contracts/scan-batch-request';
import { ScanRunRequest } from '../api-contracts/scan-run-request';
import { MockScanDataProvider } from '../providers/mock-scan-data-provider';
import { ApiController } from './api-controller';

export class ScanController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-mock';
    protected readonly logger: Logger;
    protected readonly serviceConfig: ServiceConfiguration;

    constructor(
        protected readonly context: Context,
        private readonly mockScanDataProvider: MockScanDataProvider = new MockScanDataProvider(),
    ) {
        super();
    }

    public async handleRequest(): Promise<void> {
        return;
    }

    public getScanResult(): void {
        const scanId = <string>this.context.bindingData.scanId;
        const response = this.mockScanDataProvider.createScanResultMock(scanId, this.context.req.url);
        this.context.res = {
            status: 200, // OK
            body: response,
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }

    public getScanResults(): void {
        const payload = this.tryGetPayload<ScanBatchRequest[]>();
        if (payload !== undefined) {
            const response = this.mockScanDataProvider.createScanResultMocks(payload, this.context.req.url);
            this.context.res = {
                status: 200, // OK
                body: response,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }
    }

    public postScanRunRequests(): void {
        const payload = this.tryGetPayload<ScanRunRequest[]>();
        if (payload !== undefined) {
            const response = this.mockScanDataProvider.createScanRunRequestMocks(payload);
            this.context.res = {
                status: 202, // Accepted
                body: response,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }
    }
}
