// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type PostScanRequestOptions = {
    priority?: number;
    consolidatedId?: string;
    deepScan?: boolean;
    deepScanOptions?: DeepScanOptions;
    privacyScan?: boolean;
    authenticationType?: AuthenticationType;
};

export type DeepScanOptions = {
    baseUrl?: string;
    knownPages?: string[];
    discoveryPatterns?: string[];
};

export type AuthenticationType = 'undetermined' | 'entraId' | 'bearerToken';
