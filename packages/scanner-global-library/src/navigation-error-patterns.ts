// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BrowserErrorTypes } from './browser-error';

export const navigationErrorPatterns: Partial<Record<BrowserErrorTypes, string[]>> = {
    UrlNavigationTimeout: ['Navigation timeout', 'net::ERR_CONNECTION_TIMED_OUT'],
    SslError: [
        'net::ERR_CERT_AUTHORITY_INVALID',
        'net::ERR_CERT_DATE_INVALID',
        'net::ERR_HTTP2_INADEQUATE_TRANSPORT_SECURITY',
        'net::ERR_CERT_COMMON_NAME_INVALID',
        'SSL_ERROR_UNKNOWN',
    ],
    ResourceLoadFailure: ['net::ERR_CONNECTION_REFUSED', 'NS_ERROR_CONNECTION_REFUSED'],
    InvalidUrl: ['Cannot navigate to invalid URL', 'Invalid url'],
    EmptyPage: ['net::ERR_ABORTED', 'NS_BINDING_ABORTED'],
    UrlNotResolved: ['net::ERR_NAME_NOT_RESOLVED'],
};
