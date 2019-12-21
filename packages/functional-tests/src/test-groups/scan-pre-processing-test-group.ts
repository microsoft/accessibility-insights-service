// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { FunctionalTestGroup } from './functional-test-group';

export class ScanPreProcessingTestGroup extends FunctionalTestGroup {
    protected registerTestCases(): void {
        this.registerTestCase(async () => this.testScanRequestPersisted());
    }

    private async testScanRequestPersisted(): Promise<void> {
        const scanRunResult = await this.onDemandPageScanRunResultProvider.readScanRun(this.testContextData.scanId);

        this.expectToBeDefined(scanRunResult, 'testScanRequestPersisted');

        this.testContextData.scanRunState = scanRunResult.run.state;
    }
}
