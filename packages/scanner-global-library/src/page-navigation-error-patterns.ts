// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ScanErrorTypes } from 'storage-documents';

export const pageNavigationErrorPatterns: Partial<Record<ScanErrorTypes, string[]>> = {
    UrlNavigationTimeout: ['Navigation timeout', 'ERR_CONNECTION_TIMED_OUT', 'Timeout exceeded'],
    SslError: [
        'ERR_CERT_AUTHORITY_INVALID',
        'ERR_CERT_DATE_INVALID',
        'ERR_HTTP2_INADEQUATE_TRANSPORT_SECURITY',
        'ERR_CERT_COMMON_NAME_INVALID',
        'SSL_ERROR_UNKNOWN',
        'ERR_SSL_VERSION_OR_CIPHER_MISMATCH',
    ],
    ResourceLoadFailure: ['ERR_CONNECTION_REFUSED', 'NS_ERROR_CONNECTION_REFUSED', 'ERR_CONNECTION_RESET'],
    InvalidUrl: ['Cannot navigate to invalid URL', 'Invalid url'],
    EmptyPage: ['ERR_ABORTED', 'NS_BINDING_ABORTED'],
    UrlNotResolved: ['ERR_NAME_NOT_RESOLVED'],
};
