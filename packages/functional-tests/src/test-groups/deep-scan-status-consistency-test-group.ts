// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { ResponseWithBodyType } from 'common';
import { RunState, ScanRunResultResponse } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class DeepScanStatusConsistencyTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testConsistentStatus(): Promise<void> {
        const response = (await this.a11yServiceClient.getScanStatus(
            this.testContextData.scanId,
        )) as ResponseWithBodyType<ScanRunResultResponse>;

        this.ensureResponseSuccessStatusCode(response);

        const crawledUrlStates = response.body.deepScanResult.map((r) => r.scanRunState);
        const doneScanning = crawledUrlStates.every((s) => s === 'completed' || s === 'failed');
        const allowedOverallStates: RunState[] = doneScanning ? ['completed', 'failed'] : ['accepted', 'pending', 'queued', 'running'];
        expect(response.body.run.state, 'overall scan state should be consistent with individual URL states').to.be.oneOf(
            allowedOverallStates,
        );
    }
}
