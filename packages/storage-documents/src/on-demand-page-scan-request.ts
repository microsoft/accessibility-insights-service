// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from './item-type';
import { StorageDocument } from '.';

export interface OnDemandPageScanRequest extends StorageDocument {
    url: string;
    priority: number;
    itemType: ItemType.onDemandPageScanRequest;
    scanNotifyUrl?: string;
}
