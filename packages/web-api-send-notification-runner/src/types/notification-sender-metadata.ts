import { OnDemandPageScanRunState, ScanState } from 'storage-documents';

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface NotificationSenderMetadata {
    scanId: string;
    scanNotifyUrl: string;
    runStatus: OnDemandPageScanRunState;
    scanStatus: ScanState;
}
