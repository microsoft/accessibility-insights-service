// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ItemType, StorageDocument } from '.';

/**
 * The client page scan run batch request document.
 */
export interface OnDemandPageScanBatchRequest extends StorageDocument {
    scanRunBatchRequest: ScanRunBatchRequest[];
    itemType: ItemType.scanRunBatchRequest;
}

export interface ScanRunBatchRequest {
    scanId?: string;
    url: string;
    error?: string;
}
