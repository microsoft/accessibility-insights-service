// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanRunResultResponse } from 'service-library';
import { expect } from 'chai';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class FailedScanNotificationTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testScanNotificationFail(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);
        const notification = (<ScanRunResultResponse>response.body).notification;

        // Consolidated scan request submitted with the scan notification url endpoint that would always fail.
        expect(notification.state).to.equal('sendFailed');
    }
}
