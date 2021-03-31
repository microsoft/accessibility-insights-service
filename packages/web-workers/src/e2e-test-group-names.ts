// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { functionalTestGroupTypes, TestGroupName } from 'functional-tests';

export type E2ETestGroupNames = {
    [key in
        | 'postScanSubmissionTests'
        | 'postScanCompletionTests'
        | 'scanReportTests'
        | 'postScanCompletionNotificationTests'
        | 'finalizerTests']: TestGroupName[];
};

export const e2eTestGroupNames: E2ETestGroupNames = {
    postScanSubmissionTests: ['PostScan', 'ScanStatus'],
    postScanCompletionTests: ['ScanPreProcessing', 'ScanQueueing'],
    scanReportTests: ['ScanReports'],
    postScanCompletionNotificationTests: ['ScanCompletionNotification'],
    finalizerTests: ['Finalizer'],
};

export function getAllTestGroupClassNames(): string[] {
    const flattenedNames: TestGroupName[] = [].concat(...Object.values(e2eTestGroupNames));

    return flattenedNames.map((name) => functionalTestGroupTypes[name].name);
}
