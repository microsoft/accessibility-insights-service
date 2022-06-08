// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { some } from 'lodash';
import { ScanReport, ScanRunResultResponse } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class PrivacyScanReportsTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testReportFormats(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);
        const reports = (<ScanRunResultResponse>response.body).reports;

        expect(
            some(reports, (report) => report.format === 'json'),
            'Expected privacy scan json report',
        ).to.be.true;
        expect(
            some(reports, (report) => report.format === 'consolidated.json'),
            'Expected privacy scan consolidated report',
        ).to.be.true;
        expect(
            some(reports, (report) => report.format === 'page.mhtml'),
            'Expected page snapshot report',
        ).to.be.true;
        expect(
            some(reports, (report) => report.format === 'page.png'),
            'Expected page screenshot report',
        ).to.be.true;
    }

    @test(TestEnvironment.all)
    public async testGetReports(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);
        const reportsInfo = (<ScanRunResultResponse>response.body).reports;

        await Promise.all(
            reportsInfo.map(async (reportData: ScanReport) => {
                const reportResponse = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, reportData.reportId);

                this.ensureResponseSuccessStatusCode(response);
                expect(reportResponse.body, 'Get scan report API should return response with defined body').to.not.be.undefined;
            }),
        );
    }
}
