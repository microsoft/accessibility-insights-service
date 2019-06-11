// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RunState } from './states';

export interface RunResult {
    runTime: string;
    state: RunState;
    error?: string;
    retries?: number;
}
