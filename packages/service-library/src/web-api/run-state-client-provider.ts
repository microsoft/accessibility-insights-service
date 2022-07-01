// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ServiceConfiguration } from 'common';
import { OnDemandPageScanResult } from 'storage-documents';
import moment from 'moment';
import { isEmpty } from 'lodash';
import { RunState } from './api-contracts/scan-result-response';

@injectable()
export class RunStateClientProvider {
    public constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    /**
     * Returns effective scan run state based on retry and other conditions
     * @param pageScanResult Page scan result DB document
     */
    public async getEffectiveRunState(pageScanResult: OnDemandPageScanResult): Promise<RunState> {
        if (isEmpty(pageScanResult.run)) {
            return undefined;
        }

        if (['running', 'failed'].includes(pageScanResult.run.state)) {
            return this.getEffectiveRunStateIfAbandon(pageScanResult);
        }

        return pageScanResult.run.state;
    }

    private async getEffectiveRunStateIfAbandon(pageScanResult: OnDemandPageScanResult): Promise<RunState> {
        const taskConfig = await this.serviceConfig.getConfigValue('taskConfig');
        // scan is still running within allowed run window
        if (
            pageScanResult.run.state === 'running' &&
            moment.utc(pageScanResult.run.timestamp).add(taskConfig.taskTimeoutInMinutes, 'minutes') > moment.utc()
        ) {
            return pageScanResult.run.state;
        }

        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
        // scan is not running and no scan retry attempt left
        if (pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount) {
            return 'failed';
        }

        // scan is not running but there is retry attempt
        return 'retrying';
    }
}
