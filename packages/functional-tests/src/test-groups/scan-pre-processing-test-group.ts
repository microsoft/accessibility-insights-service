// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TestEnvironment } from '../common-types';
import { FunctionalTestGroup } from './functional-test-group';

export class ScanPreProcessingTestGroup extends FunctionalTestGroup {
    protected registerTestCases(env: TestEnvironment): void {
        this.registerTestCase(async () => this.testScanRequestPersisted());
    }

    private async testScanRequestPersisted(): Promise<boolean> {
        const scanRunResult = await this.onDemandPageScanRunResultProvider.readScanRun(this.testContextData.scanId);

        if (this.expectToBeDefined(scanRunResult, 'testScanRequestPersisted')) {
            this.testContextData.scanRunState = scanRunResult.run.state;

            return true;
        }

        return false;
    }
}
