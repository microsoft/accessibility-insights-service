// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { FunctionalTestGroup } from './functional-test-group';

export class ScanPreProcessingTestGroup extends FunctionalTestGroup {
    protected registerTestCases(): void {
        this.registerTestCaseForEnvironment(async () => this.testScanRequestPersisted());
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
