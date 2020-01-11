// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { A11yServiceClient, A11yServiceClientProvider, a11yServiceClientTypeNames } from 'web-api-client';
import { FunctionalTestGroup } from './test-groups/functional-test-group';
import { PostScanTestGroup } from './test-groups/post-scan-test-group';
import { ScanPreProcessingTestGroup } from './test-groups/scan-pre-processing-test-group';
import { ScanQueuingTestGroup } from './test-groups/scan-queuing-test-group';
import { ScanReportTestGroup } from './test-groups/scan-reports-test-group';
import { ScanStatusTestGroup } from './test-groups/scan-status-test-group';

export type TestGroupName = 'PostScan' | 'ScanStatus' | 'ScanPreProcessing' | 'ScanQueueing' | 'ScanReports';

export type TestGroupConstructor = new (
    a11yServiceClient: A11yServiceClient,
    onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
    guidGenerator: GuidGenerator,
) => FunctionalTestGroup;

export const functionalTestGroupTypes: { [key in TestGroupName]: TestGroupConstructor } = {
    PostScan: PostScanTestGroup,
    ScanStatus: ScanStatusTestGroup,
    ScanPreProcessing: ScanPreProcessingTestGroup,
    ScanQueueing: ScanQueuingTestGroup,
    ScanReports: ScanReportTestGroup,
};
