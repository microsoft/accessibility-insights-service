// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { functionalTestGroupTypes, TestGroupName } from 'functional-tests';

export const e2eTestGroupNames: { [key: string]: TestGroupName[] } = {
    postScanSubmissionTests: ['PostScan', 'ScanStatus'],
    postScanCompletionTests: ['ScanPreProcessing', 'ScanQueueing'],
    scanReportTests: ['ScanReports'],
    finalizerTests: ['Finalizer'],
};

export function getAllTestGroupClassNames(): string[] {
    let allTestGroupClassNames: string[] = [];
    Object.keys(e2eTestGroupNames).forEach(key => {
        const testGroupNames = e2eTestGroupNames[key];
        const testGroupClassNames = testGroupNames.map(name => {
            const theClass = functionalTestGroupTypes[name];

            return theClass.name;
        });
        allTestGroupClassNames = allTestGroupClassNames.concat(testGroupClassNames);
    });

    return allTestGroupClassNames;
}
