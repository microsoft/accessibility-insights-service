// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CombinedScanResultsReadResponse } from 'service-library';

export interface CombinedResultsBlob {
    response: CombinedScanResultsReadResponse;
    blobId: string;
}
