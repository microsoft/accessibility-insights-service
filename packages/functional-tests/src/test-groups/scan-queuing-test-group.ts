// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable: no-unused-expression

export class ScanQueuingTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testScanQueued(): Promise<void> {
        const scanRunResult = await this.onDemandPageScanRunResultProvider.readScanRun(this.testContextData.scanId);
        const expectedStates = ['queued', 'running', 'completed', 'failed'];
        const scanQueued = expectedStates.indexOf(scanRunResult.run.state) !== -1;

        expect(scanQueued, `Scan state should be one of ${expectedStates.join(', ')}`).to.be.true;
    }
}
