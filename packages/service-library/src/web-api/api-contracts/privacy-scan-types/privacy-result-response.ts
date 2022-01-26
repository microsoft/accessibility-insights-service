// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DeepScanResultItem, ScanReport, ScanRun } from '../scan-result-response';

export type privacyResultResponse = {
    scanId: string;
    url: string;
    scannedUrl?: string;
    deepScanResult?: DeepScanResultItem[];
    reports?: ScanReport[];
    run: ScanRun;
};
