import { ScanState } from 'storage-documents';

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface NotificationSenderMetadata {
    id: string;
    replyUrl: string;
    scanStatus: ScanState;
}
