// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';

export interface AxeScanResults {
    results?: AxeResults;
    error?: string;
    unscannable?: boolean;
    redirectedFromUrl?: string;
}
