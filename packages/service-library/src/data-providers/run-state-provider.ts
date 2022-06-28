// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ServiceConfiguration } from 'common';
import { OnDemandPageScanRunState, OnDemandPageScanResult } from 'storage-documents';
import moment from 'moment';
import { isEmpty } from 'lodash';

@injectable()
export class RunStateProvider {
    public constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    /**
     * Returns effective scan run state based on retry and other conditions
     * @param pageScanResult Page scan result DB document
     */
    public async getEffectiveRunState(pageScanResult: OnDemandPageScanResult): Promise<OnDemandPageScanRunState> {
        if (isEmpty(pageScanResult.run)) {
            return undefined;
        }

        if (['running', 'report', 'failed'].includes(pageScanResult.run.state)) {
            return this.getEffectiveRunStateWhenAbandon(pageScanResult);
        }

        return pageScanResult.run.state;
    }

    private async getEffectiveRunStateWhenAbandon(pageScanResult: OnDemandPageScanResult): Promise<OnDemandPageScanRunState> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
        // no scan retry attempt left
        if (pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount) {
            return 'failed';
        }

        const taskConfig = await this.serviceConfig.getConfigValue('taskConfig');
        // scan is running and still within allowed run window
        if (
            ['running', 'report'].includes(pageScanResult.run.state) &&
            moment.utc(pageScanResult.run.timestamp).add(taskConfig.taskTimeoutInMinutes, 'minutes') > moment.utc()
        ) {
            return pageScanResult.run.state;
        }

        // scan is not running but there is retry attempt
        return 'retrying';
    }
}
