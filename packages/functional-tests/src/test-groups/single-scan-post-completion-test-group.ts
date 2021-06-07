// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { ScanRunResultResponse } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class SingleScanPostCompletionTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testScanRequestNoDeepScan(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureResponseSuccessStatusCode(response);
        expect((<ScanRunResultResponse>response.body).deepScanResult, 'Expected no deep scan result').to.be.undefined;
    }
}
