// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { WebApiErrorCodes } from 'service-library';

import { FunctionalTestGroup } from './functional-test-group';

export class RestApiTestGroup extends FunctionalTestGroup {
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

    private async testHealthCheck(): Promise<boolean> {
        const response = await this.a11yServiceClient.checkHealth();

        return this.ensureSuccessStatusCode(response, 'testHealthCheck');
    }

    private async testPostScan(): Promise<boolean> {
        const response = await this.a11yServiceClient.postScanUrl(this.testContextData.scanUrl);

        return (
            this.ensureSuccessStatusCode(response, 'testPostScan') &&
            this.expectToBeDefined(response.body, 'Post Scan API should return response with defined body') &&
            this.expectEqual(1, response.body.length, 'Post Scan API should return one ScanRunResponse in body') &&
            this.expectTrue(this.guidGenerator.isValidV6Guid(response.body[0].scanId), 'Post Scan API should return a valid v6 guid')
        );
    }

    private async testGetScanStatus(): Promise<boolean> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        return (
            this.ensureSuccessStatusCode(response, 'testGetScanStatus') &&
            this.expectEqual(
                this.testContextData.scanId,
                response.body.scanId,
                'Get Scan Response should return the scan id that we queried',
            )
        );
    }

    private async testGetScanStatusWithInvalidGuid(): Promise<boolean> {
        const response = await this.a11yServiceClient.getScanStatus('invalid-guid');

        return this.expectErrorResponse(WebApiErrorCodes.invalidResourceId, response, 'testGetScanStatusWithInvalidGuid');
    }

    private async testGetScanStatusWithInvalidScanId(): Promise<boolean> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanStatus(invalidGuid);

        return this.expectErrorResponse(WebApiErrorCodes.resourceNotFound, response, 'testGetScanStatusWithInvalidScanId');
    }

    private async testGetScanReport(): Promise<boolean> {
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, this.testContextData.reports[0].reportId);

        return this.ensureSuccessStatusCode(response, 'testGetScanReport');
    }

    private async testGetScanReportWithInvalidGuid(): Promise<boolean> {
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, 'invalid-guid');

        return this.expectErrorResponse(WebApiErrorCodes.invalidResourceId, response, 'testGetScanReportWithInvalidGuid');
    }

    private async testGetScanReportWithInvalidScanId(): Promise<boolean> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, invalidGuid);

        return this.expectErrorResponse(WebApiErrorCodes.resourceNotFound, response, 'testGetScanReportWithInvalidScanId');
    }
}
