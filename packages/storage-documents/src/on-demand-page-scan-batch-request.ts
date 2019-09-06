// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from '.';

/**
 * The client page scan run batch request document.
 */
export interface OnDemandPageScanBatchRequest extends StorageDocument {
    scanRunBatchRequest: ScanRunBatchRequest[];
}

export interface ScanRunBatchRequest {
    scanId?: string;
    url: string;
    error?: string;
}
