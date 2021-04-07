// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type PostScanRequestOptions = {
    priority?: number;
    scanNotificationUrl?: string;
    consolidatedId?: string;
    deepScan?: boolean;
    deepScanOptions?: DeepScanOptions;
};

export type DeepScanOptions = {
    knownPages?: string[];
    discoveryPatterns?: string[];
};
