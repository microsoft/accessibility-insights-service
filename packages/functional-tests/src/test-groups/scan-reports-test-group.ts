// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { ScanReport, ScanRunResultResponse, WebApiErrorCodes } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class ScanReportTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testReportGenerated(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureResponseSuccessStatusCode(response);
        expect((<ScanRunResultResponse>response.body).reports, 'Expected a valid reports response result').to.not.be.undefined;
        expect((<ScanRunResultResponse>response.body).reports, 'Expected two reports to be returned').to.have.lengthOf(2);
    }

    @test(TestEnvironment.all)
    public async testGetReports(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);
        const reportsInfo = (<ScanRunResultResponse>response.body).reports;
        await Promise.all(
            reportsInfo.map(async (reportData: ScanReport) => {
                const reportResponse = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, reportData.reportId);

                this.ensureResponseSuccessStatusCode(response);
                expect(reportResponse.body, 'Get Scan Report API should return response with defined body').to.not.be.undefined;
            }),
        );
    }

    @test(TestEnvironment.all)
    public async testGetConsolidatedReport(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.consolidatedScanId);
        const reportsInfo = (<ScanRunResultResponse>response.body).reports;

        expect((<ScanRunResultResponse>response.body).reports, 'Expected three reports to be returned').to.have.lengthOf(3);

        await Promise.all(
            reportsInfo.map(async (reportData: ScanReport) => {
                const reportResponse = await this.a11yServiceClient.getScanReport(
                    this.testContextData.consolidatedScanId,
                    this.testContextData.consolidatedReportId,
                );

                this.ensureResponseSuccessStatusCode(response);
                expect(reportResponse.body, 'Get Scan Report API should return response with defined body').to.not.be.undefined;
            }),
        );
    }

    @test(TestEnvironment.all)
    public async testGetScanReportWithInvalidGuid(): Promise<void> {
        const invalidGuid = 'invalid guid';
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async testGetScanReportWithInvalidScanId(): Promise<void> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, response);
    }
}
