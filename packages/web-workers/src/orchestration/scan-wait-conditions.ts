// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanRunResultResponse } from 'service-library';

export type ScanWaitCondition = {
    isSucceeded(requestResponse: ScanRunResultResponse): boolean;
    isFailed(requestResponse: ScanRunResultResponse): boolean;
};

export const ScanWaitConditions = {
    baseScan: {
        isSucceeded: (scanRunResult: ScanRunResultResponse): boolean =>
            scanRunResult.scanResult?.state === 'pass' || scanRunResult.scanResult?.state === 'fail',
        isFailed: (scanRunResult: ScanRunResultResponse): boolean => scanRunResult.run?.state === 'failed',
    },
    deepScan: {
        isSucceeded: (scanRunResult: ScanRunResultResponse): boolean => scanRunResult.run?.state === 'completed',
        isFailed: (scanRunResult: ScanRunResultResponse): boolean => scanRunResult.run?.state === 'failed',
    },
};
