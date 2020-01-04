// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TestEnvironment } from '../common-types';
import { FunctionalTestGroup } from './functional-test-group';

export class ScanQueuingTestGroup extends FunctionalTestGroup {
    protected registerTestCases(env: TestEnvironment): void {
        this.registerTestCase(async () => this.testScanQueued());
    }

    private async testScanQueued(): Promise<boolean> {
        const scanRunResult = await this.onDemandPageScanRunResultProvider.readScanRun(this.testContextData.scanId);
        const scanQueued = ['queued', 'running', 'completed', 'failed'].indexOf(scanRunResult.run.state) !== -1;

        return this.expectTrue(scanQueued, 'testScanQueued');
    }
}
