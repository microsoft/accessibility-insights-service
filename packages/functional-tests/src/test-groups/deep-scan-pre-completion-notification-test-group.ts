// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { ResponseWithBodyType } from 'common';
import { ScanRunResultResponse } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class DeepScanPreCompletionNotificationTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testScanNotification(): Promise<void> {
        const response = (await this.a11yServiceClient.getScanStatus(
            this.testContextData.scanId,
        )) as ResponseWithBodyType<ScanRunResultResponse>;

        this.ensureResponseSuccessStatusCode(response);
        expect(response.body.notification, 'Deep scan result should contain a notification field').to.not.be.undefined;

        const crawledUrlStates = response.body.deepScanResult.map((r) => r.scanRunState);
        const doneScanning = crawledUrlStates.every((s) => s === 'completed' || s === 'failed');
        const notificationSent = ['sent', 'sendFailed'].includes(response.body.notification.state);
        expect(notificationSent, 'Deep scan notification should not be sent until all scans complete').to.equal(doneScanning);
    }
}
