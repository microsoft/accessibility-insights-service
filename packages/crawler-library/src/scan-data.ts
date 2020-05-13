// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';

export interface ScanData {
    id: string;
    title: string;
    url: string;
    succeeded: boolean;
    button?: string;
    error?: string;
    requestErrors?: string[];
    axeResults?: AxeResults;
}
