// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from '.';
import { ItemType } from './item-type';

export interface UnProcessedPageScanRequest extends StorageDocument {
    url: string;
    priority: number;
    itemType: ItemType.UnProcessedPageScanRequests;
}
