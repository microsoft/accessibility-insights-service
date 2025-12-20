// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type PostScanRequestOptions = {
    priority?: number;
    scanNotificationUrl?: string;
    consolidatedId?: string;
    deepScan?: boolean;
    deepScanOptions?: DeepScanOptions;
    privacyScan?: boolean;
    authenticationType?: AuthenticationType;
};

export type DeepScanOptions = {
    knownPages?: string[];
    discoveryPatterns?: string[];
};

export type AuthenticationType = 'undetermined' | 'entraId' | 'bearerToken';
