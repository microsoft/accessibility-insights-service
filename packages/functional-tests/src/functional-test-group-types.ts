// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator } from 'common';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { A11yServiceClient } from 'web-api-client';
import { ConsolidatedScanReportsTestGroup } from './test-groups/consolidated-scan-reports-test-group';
import { DeepScanPostCompletionTestGroup } from './test-groups/deep-scan-post-completion-test-group';
import { DeepScanReportsTestGroup } from './test-groups/deep-scan-reports-test-group';
import { FailedScanNotificationTestGroup } from './test-groups/failed-scan-notification-test-group';
import { FinalizerTestGroup } from './test-groups/finalizer-test-group';
import { FunctionalTestGroup } from './test-groups/functional-test-group';
import { PostScanTestGroup } from './test-groups/post-scan-test-group';
import { ScanCompletionNotificationTestGroup } from './test-groups/scan-completion-notification-test-group';
import { ScanPreProcessingTestGroup } from './test-groups/scan-pre-processing-test-group';
import { ScanQueuingTestGroup } from './test-groups/scan-queuing-test-group';
import { ScanReportTestGroup } from './test-groups/scan-reports-test-group';
import { ScanStatusTestGroup } from './test-groups/scan-status-test-group';

export type TestGroupName =
    | 'PostScan'
    | 'ScanStatus'
    | 'ScanPreProcessing'
    | 'ScanQueueing'
    | 'ScanReports'
    | 'ConsolidatedScanReports'
    | 'ScanCompletionNotification'
    | 'FailedScanNotification'
    | 'DeepScanPostCompletion'
    | 'DeepScanReports'
    | 'Finalizer';

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
    ConsolidatedScanReports: ConsolidatedScanReportsTestGroup,
    ScanCompletionNotification: ScanCompletionNotificationTestGroup,
    FailedScanNotification: FailedScanNotificationTestGroup,
    DeepScanPostCompletion: DeepScanPostCompletionTestGroup,
    DeepScanReports: DeepScanReportsTestGroup,
    Finalizer: FinalizerTestGroup,
};
