// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ServiceConfiguration } from 'common';
import { injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController } from 'service-library';
import { ScanBatchRequest } from '../api-contracts/scan-batch-request';
import { MockScanDataProvider } from '../providers/mock-scan-data-provider';

@injectable()
export class ScanController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-mock';
    protected readonly logger: Logger;
    protected readonly serviceConfig: ServiceConfiguration;

    constructor(private readonly mockScanDataProvider: MockScanDataProvider = new MockScanDataProvider()) {
        super();
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

    public async handleRequest(): Promise<void> {
        if (this.context.req.url.indexOf('/api/scans/$batch') > 0) {
            this.getScanResults();

            return;
        }

        if (this.context.req.url.indexOf('/api/scans/') > 0) {
            this.getScanResult();

            return;
        }

        this.context.res = {
            status: 404,
        };

        return;
    }
}
