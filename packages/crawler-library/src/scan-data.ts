// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ScanData {
    id: string;
    url: string;
    succeeded: boolean;
    activatedElement?: {
        html: string;
        selector: string;
        hash: string;
        clickAction: string;
        navigationUrl?: string;
    };
    error?: string;
    requestErrors?: string[];
}
