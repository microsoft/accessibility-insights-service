// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

// tslint:disable: no-unused-expression

export class PostScanTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testPostScan(): Promise<void> {
        const response = await this.a11yServiceClient.postScanUrl(this.testContextData.scanUrl);

        this.ensureResponseSuccessStatusCode(response);
        expect(response.body, 'Post Scan API should return response with defined body').to.not.be.undefined;
        expect(response.body.length).to.be.equal(1, 'Post Scan API should return one ScanRunResponse in body');
        expect(this.guidGenerator.isValidV6Guid(response.body[0].scanId), 'Post Scan API should return a valid v6 GUID').to.be.true;
    }
}
