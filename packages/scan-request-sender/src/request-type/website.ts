// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface ScanRequest {
    id: string;
    count: number;
    websites: WebSite[];
}

export interface WebSite {
    id: string;
    name: string;
    baseUrl: string;
    scanUrl: string;
    serviceTreeId: string;
}
