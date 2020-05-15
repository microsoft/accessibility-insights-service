// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ScanData {
    id: string;
    url: string;
    succeeded: boolean;
    activeElement?: {
        html: string;
        selector: string;
    };
    error?: string;
    requestErrors?: string[];
}
