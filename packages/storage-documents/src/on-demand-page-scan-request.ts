// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from '.';
import { ItemType } from './item-type';

export interface OnDemandPageScanRequest extends StorageDocument {
    url: string;
    priority: number;
    itemType: ItemType.onDemandPageScanRequest;
    scanNotifyUrl?: string;
}
