// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { WebApiErrorCodes } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable: no-unused-expression

export class RestApiTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testHealthCheck(): Promise<void> {
        const response = await this.a11yServiceClient.checkHealth();

        this.ensureResponseSuccessStatusCode(response);
    }

    @test(TestEnvironment.all)
    public async testPostScan(): Promise<void> {
        const response = await this.a11yServiceClient.postScanUrl(this.testContextData.scanUrl);

        this.ensureResponseSuccessStatusCode(response);
        expect(response.body, 'Post Scan API should return response with defined body').to.not.be.undefined;
        expect(response.body.length).to.be.equal(1, 'Post Scan API should return one ScanRunResponse in body');
        expect(this.guidGenerator.isValidV6Guid(response.body[0].scanId), 'Post Scan API should return a valid v6 GUID').to.be.true;
    }

    @test(TestEnvironment.all)
    public async testGetScanStatus(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureResponseSuccessStatusCode(response);
        expect(response.body.scanId, 'Get Scan Response should return the Scan ID that we queried').to.be.equal(
            this.testContextData.scanId,
        );
    }

    @test(TestEnvironment.all)
    public async testGetScanStatusWithInvalidGuid(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus('invalid-guid');

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async testGetScanStatusWithInvalidScanId(): Promise<void> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanStatus(invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, response);
    }

    @test(TestEnvironment.all)
    public async testGetScanReport(): Promise<void> {
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, this.testContextData.reportId);

        this.ensureResponseSuccessStatusCode(response);
    }

    @test(TestEnvironment.all)
    public async testGetScanReportWithInvalidGuid(): Promise<void> {
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, 'invalid-guid');

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async testGetScanReportWithInvalidScanId(): Promise<void> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, response);
    }
}
