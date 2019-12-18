// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { WebApiErrorCodes } from 'service-library';

import { TestGroup } from './test-group';

export class RestApiTestGroup extends TestGroup {
    protected registerTestCases(): void {
        this.registerTestCase(async () => this.testHealthCheck());
        this.registerTestCase(async () => this.testPostScan());
        this.registerTestCase(async () => this.testGetScanStatus());
        this.registerTestCase(async () => this.testGetScanStatusWithInvalidGuid());
        this.registerTestCase(async () => this.testGetScanStatusWithInvalidScanId());
    }

    private async testHealthCheck(): Promise<void> {
        const response = await this.a11yServiceClient.checkHealth();

        this.ensureSuccessStatusCode(response);
    }

    private async testPostScan(): Promise<void> {
        const response = await this.a11yServiceClient.postScanUrl(this.testConfig.urlToScan);

        this.ensureSuccessStatusCode(response);
    }

    private async testGetScanStatus(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.scanId);

        this.ensureSuccessStatusCode(response);
        this.expectEqual(this.scanId, response.body.scanId);
    }

    private async testGetScanStatusWithInvalidGuid(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus('invalid-guid');

        this.expectErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    private async testGetScanStatusWithInvalidScanId(): Promise<void> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanStatus(invalidGuid);

        this.expectErrorResponse(WebApiErrorCodes.resourceNotFound, response);
    }
}
