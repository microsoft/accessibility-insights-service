// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { ScanReport, ScanRunResultResponse } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable: no-unused-expression

export class ScanReportTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testReportGenerated(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureResponseSuccessStatusCode(response);
        expect((<ScanRunResultResponse>response.body).reports, 'Expected a valid reports response result').to.not.be.undefined;
        expect((<ScanRunResultResponse>response.body).reports.length, 'Expected at least a single report to be returned').to.be.true;
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
}
