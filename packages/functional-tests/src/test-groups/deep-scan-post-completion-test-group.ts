// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect, use } from 'chai';
import * as deepEqualInAnyGroup from 'deep-equal-in-any-order';
import { ResponseWithBodyType } from 'common';
import { ScanRunResultResponse } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class DeepScanPostCompletionTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testGetScanStatus(): Promise<void> {
        use(deepEqualInAnyGroup.default);

        const response = (await this.a11yServiceClient.getScanStatus(
            this.testContextData.scanId,
        )) as ResponseWithBodyType<ScanRunResultResponse>;

        this.ensureResponseSuccessStatusCode(response);
        expect(response.body.scanId, 'Get Scan Response should return the Scan ID that we queried').to.be.equal(
            this.testContextData.scanId,
        );

        const crawledUrls = response.body.deepScanResult.map((r) => r.url);
        expect(
            crawledUrls,
            `response should include expected crawled URLs for scan ID ${this.testContextData.scanId}`,
        ).to.deep.equalInAnyOrder(this.testContextData.expectedCrawledUrls);

        const scansCompleted = response.body.deepScanResult.map((r) => r.scanRunState).every((s) => s === 'completed');
        expect(scansCompleted, 'overall scan state matches individual states').to.equal(response.body.run.state === 'completed');
        expect(scansCompleted, 'all crawled URL scans should be completed').true;
    }
}
