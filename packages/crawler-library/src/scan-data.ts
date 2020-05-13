// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ScanData {
    id: string;
    url: string;
    succeeded: boolean;
    button?: string;
    error?: string;
    requestErrors?: string[];
}
