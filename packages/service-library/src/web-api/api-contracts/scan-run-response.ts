// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { WebApiError } from '../web-api-error-codes';

/**
 * Defines the REST API response contract that is returned on HTTP POST scan request
 */
export interface ScanRunResponse {
    scanId?: string;
    url: string;
    error?: WebApiError;
}
