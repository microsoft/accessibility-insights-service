// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { ResponseWithBodyType } from 'common';
import { DeepScanResultItem, ScanRunResultResponse } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class DeepScanReportsTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testGetReports(): Promise<void> {
        const response =
            await this.a11yServiceClient.getScanStatus(this.testContextData.scanId) as ResponseWithBodyType<ScanRunResultResponse>;

        await Promise.all(
            response.body.deepScanResult.map(async (item: DeepScanResultItem) => {
                const crawledResponse =
                    await this.a11yServiceClient.getScanStatus(item.scanId) as ResponseWithBodyType<ScanRunResultResponse>;

                const htmlReportId = crawledResponse.body.reports.find(r => r.format === 'html').reportId;
                const reportResponse = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, htmlReportId);

                this.ensureResponseSuccessStatusCode(response);
                expect(reportResponse.body, 'can retrieve individual HTML report for each deep scan crawled URL').to.not.be.undefined;
            }),
        );
    }
}
