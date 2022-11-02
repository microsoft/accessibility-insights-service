// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type BrowserErrorTypes =
    | 'Error'
    | 'UrlNavigationTimeout'
    | 'SslError'
    | 'ResourceLoadFailure'
    | 'InvalidUrl'
    | 'EmptyPage'
    | 'HttpErrorCode'
    | 'NavigationError'
    | 'InvalidContentType'
    | 'UrlNotResolved'
    | 'ScanTimeout'
    | 'BannerXPathNotDetected';

export interface BrowserError {
    errorType: BrowserErrorTypes;
    statusCode?: number;
    statusText?: string;
    message: string;
    stack: string;
}
