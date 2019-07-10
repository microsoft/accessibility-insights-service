// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ScanRequestMessage {
    baseUrl: string;
    name?: string;
    serviceTreeId?: string;
    url: string;
    websiteId: string;
}
