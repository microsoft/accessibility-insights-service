// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type PostScanRequestOptions = {
    priority?: number;
    consolidatedId?: string;
    deepScan?: boolean;
    deepScanOptions?: DeepScanOptions;
    privacyScan?: boolean;
};

export type DeepScanOptions = {
    knownPages?: string[];
    discoveryPatterns?: string[];
};
