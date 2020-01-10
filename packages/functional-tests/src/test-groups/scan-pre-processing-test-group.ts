// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable: no-unused-expression

export class ScanPreProcessingTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testScanRequestPersisted(): Promise<void> {
        const scanRunResult = await this.onDemandPageScanRunResultProvider.readScanRun(this.testContextData.scanId);

        expect(scanRunResult, 'Expected a valid scan result').to.not.be.undefined;
    }
}
