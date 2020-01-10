// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { A11yServiceClientProvider, a11yServiceClientTypeNames } from 'web-api-client';
import { FunctionalTestGroup } from './test-groups/functional-test-group';
import { PostScanTestGroup } from './test-groups/post-scan-test-group';
import { ScanPreProcessingTestGroup } from './test-groups/scan-pre-processing-test-group';
import { ScanQueuingTestGroup } from './test-groups/scan-queuing-test-group';
import { ScanReportTestGroup } from './test-groups/scan-reports-test-group';
import { ScanStatusTestGroup } from './test-groups/scan-status-test-group';

export type TestGroupName = 'PostScan' | 'ScanStatus' | 'ScanPreProcessing' | 'ScanQueueing' | 'ScanReports';

@injectable()
export class FunctionalTestGroupFactory {
    constructor(
        @inject(a11yServiceClientTypeNames.A11yServiceClientProvider)
        protected readonly a11yServiceClientProvider: A11yServiceClientProvider,
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
    ) {}

    public async createFunctionalTestGroup(testGroupName: TestGroupName): Promise<FunctionalTestGroup> {
        const webApiClient = await this.a11yServiceClientProvider();
        switch (testGroupName) {
            case 'PostScan':
                return new PostScanTestGroup(webApiClient, this.onDemandPageScanRunResultProvider, this.guidGenerator);
            case 'ScanStatus':
                return new ScanStatusTestGroup(webApiClient, this.onDemandPageScanRunResultProvider, this.guidGenerator);
            case 'ScanPreProcessing':
                return new ScanPreProcessingTestGroup(webApiClient, this.onDemandPageScanRunResultProvider, this.guidGenerator);
            case 'ScanQueueing':
                return new ScanQueuingTestGroup(webApiClient, this.onDemandPageScanRunResultProvider, this.guidGenerator);
            case 'ScanReports':
                return new ScanReportTestGroup(webApiClient, this.onDemandPageScanRunResultProvider, this.guidGenerator);
            default:
                throw new Error(`No factory for FunctionalTestGroup with name ${testGroupName}`);
        }
    }
}
