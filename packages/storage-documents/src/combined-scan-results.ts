// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeCoreResults, UrlCount } from 'axe-result-converter';
import { StorageDocument } from './storage-document';

export interface CombinedScanResults extends StorageDocument {
    urlCount: UrlCount;
    axeResults: AxeCoreResults;
}
