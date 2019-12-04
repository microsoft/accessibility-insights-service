// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';

export type ScanErrorTypes =
    | 'UrlNavigationTimeout'
    | 'SslError'
    | 'ResourceLoadFailure'
    | 'InvalidUrl'
    | 'EmptyPage'
    | 'HttpErrorCode'
    | 'NavigationError'
    | 'InvalidContentType'
    | 'UrlNotResolved';

export interface ScanError {
    errorType: ScanErrorTypes;
    responseStatusCode?: number;
    message: string;
}

export interface AxeScanResults {
    results?: AxeResults;
    error?: string | ScanError;
    unscannable?: boolean;
    scannedUrl?: string;
    pageTitle?: string;
    browserSpec?: string;
}
