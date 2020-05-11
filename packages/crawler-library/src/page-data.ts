// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';

export interface PageData {
    title: string;
    url: string;
    succeeded: boolean;
    error?: string;
    requestErrors?: string;
    axeResults?: AxeResults;
}
