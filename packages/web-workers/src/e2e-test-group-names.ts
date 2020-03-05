// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TestGroupName } from 'functional-tests';

export const e2eTestGroupNames: { [key: string]: TestGroupName[] } = {
    postScanSubmissionTests: ['PostScan', 'ScanStatus'],
    postScanCompletionTests: ['ScanPreProcessing', 'ScanQueueing'],
    scanReportTests: ['ScanReports'],
    finalizerTests: ['Finalizer'],
};

export function getAllTestGroupNames(): TestGroupName[] {
    let allTestGroupNames: TestGroupName[] = [];
    Object.keys(e2eTestGroupNames).forEach(key => {
        allTestGroupNames = allTestGroupNames.concat(e2eTestGroupNames[key]);
    });

    return allTestGroupNames;
}
