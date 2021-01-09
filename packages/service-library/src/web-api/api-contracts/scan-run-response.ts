// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { WebApiError } from '../web-api-error-codes';
import { RunState, ScanState } from './scan-result-response';

/**
 * Defines the REST API response contract that is returned on HTTP POST scan request
 */
export interface ScanRunResponse {
    scanId?: string;
    url: string;
    error?: WebApiError;
    deepScanResult?: DeepScanResultItem[];
}

export interface DeepScanResultItem {
    scanId: string;
    url: string;
    scanResultState?: ScanState;
    scanRunState: RunState;
}
