// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanErrorTypes } from 'storage-documents';

export interface BrowserError {
    errorType: ScanErrorTypes;
    statusCode?: number;
    statusText?: string;
    message: string;
    stack?: string;
}
