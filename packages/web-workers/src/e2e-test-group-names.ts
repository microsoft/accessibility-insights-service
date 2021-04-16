// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TestGroupName } from 'functional-tests';

export type E2ETestGroupNames = {
    [key in
        | 'postScanSubmissionTests'
        | 'postScanCompletionTests'
        | 'scanReportTests'
        | 'postScanCompletionNotificationTests'
        | 'postDeepScanCompletionTests'
        | 'finalizerTests']: TestGroupName[];
};

export const finalizerTestGroupName: TestGroupName = 'Finalizer';
