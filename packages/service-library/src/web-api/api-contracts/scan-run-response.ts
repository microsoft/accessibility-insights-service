// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { WebApiError } from '../web-api-error-codes';

export interface ScanRunResponse {
    scanId?: string;
    url: string;
    error?: WebApiError;
}
