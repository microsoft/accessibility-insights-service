import { OnDemandPageScanRunState, ScanState } from './on-demand-page-scan-result';

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface OnDemandNotificationRequestMessage {
    scanId: string;
    scanNotifyUrl: string;
    runStatus: OnDemandPageScanRunState;
    scanStatus: ScanState;
}
