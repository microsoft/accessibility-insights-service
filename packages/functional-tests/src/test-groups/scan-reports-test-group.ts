// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanReport, ScanRunResultResponse } from 'service-library';

import { TestEnvironment } from '../common-types';
import { FunctionalTestGroup } from './functional-test-group';

export class ScanReportTestGroup extends FunctionalTestGroup {
    protected registerTestCases(env: TestEnvironment): void {
        this.registerTestCase(async () => this.testReportGenerated());
        this.registerTestCase(async () => this.testGetReports());
    }

    private async testReportGenerated(): Promise<boolean> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        return (
            this.ensureSuccessStatusCode(response, 'testReportGenerated') &&
            this.expectToBeDefined((<ScanRunResultResponse>response.body).reports, 'testReportGenerated') &&
            this.expectTrue((<ScanRunResultResponse>response.body).reports.length > 0)
        );
    }

    private async testGetReports(): Promise<boolean> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);
        const reportsInfo = (<ScanRunResultResponse>response.body).reports;
        const getReportResults = await Promise.all(
            reportsInfo.map(async (reportData: ScanReport) => {
                const reportResponse = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, reportData.reportId);

                return (
                    this.ensureSuccessStatusCode(reportResponse, 'testGetReports') &&
                    this.expectToBeDefined(reportResponse.body, 'testGetReports')
                );
            }),
        );

        return getReportResults.every(val => val);
    }
}
