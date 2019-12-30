// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { FunctionalTestGroup } from './functional-test-group';

export class PostScanTestGroup extends FunctionalTestGroup {
    protected registerTestCases(): void {
        this.registerTestCaseForEnvironment(async () => this.testPostScan());
    }

    private async testPostScan(): Promise<boolean> {
        const response = await this.a11yServiceClient.postScanUrl(this.testContextData.scanUrl);

        return (
            this.ensureSuccessStatusCode(response, 'testPostScan') &&
            this.expectToBeDefined(response.body, 'Post Scan API should return response with defined body') &&
            this.expectEqual(1, response.body.length, 'Post Scan API should return one ScanRunResponse in body') &&
            this.expectTrue(this.guidGenerator.isValidV6Guid(response.body[0].scanId), 'Post Scan API should return a valid v6 guid')
        );
    }
}
