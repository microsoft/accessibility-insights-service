// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanError } from './on-demand-page-scan-result';
import { RunState } from './states';

export interface RunResult {
    runTime: string;
    state: RunState;
    error?: string | ScanError;
    retries?: number;
    unscannable?: boolean;
}
