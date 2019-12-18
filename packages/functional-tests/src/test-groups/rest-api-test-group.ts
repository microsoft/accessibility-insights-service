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
        this.registerTestCase(async () => this.testGetScanReport());
        this.registerTestCase(async () => this.testGetScanReportWithInvalidGuid());
        this.registerTestCase(async () => this.testGetScanReportWithInvalidScanId());
    }

    private async testHealthCheck(): Promise<void> {
        const response = await this.a11yServiceClient.checkHealth();

        this.ensureSuccessStatusCode(response);
    }

    private async testPostScan(): Promise<void> {
        const response = await this.a11yServiceClient.postScanUrl(this.testConfig.urlToScan);

        this.ensureSuccessStatusCode(response);
        this.expectEqual(1, response.body.length, 'Post Scan API should return one ScanRunResponse');
        this.expectTrue(this.guidGenerator.isValidV6Guid(response.body[0].scanId), 'Post Scan API should return a valid v6 guid');
    }

    private async testGetScanStatus(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureSuccessStatusCode(response);
        this.expectEqual(this.testContextData.scanId, response.body.scanId, 'Get Scan Response should return the scan id that we queried');
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

    private async testGetScanReport(): Promise<void> {
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, this.testContextData.reportId);

        this.ensureSuccessStatusCode(response);
    }

    private async testGetScanReportWithInvalidGuid(): Promise<void> {
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, 'invalid-guid');

        this.expectErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    private async testGetScanReportWithInvalidScanId(): Promise<void> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, invalidGuid);

        this.expectErrorResponse(WebApiErrorCodes.resourceNotFound, response);
    }
}
