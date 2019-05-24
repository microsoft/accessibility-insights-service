// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { RunnerEntryPoint } from './runner-entry-point';
import { setupRunnerContainer } from './setup-runner-container';

(async () => {
    const runnerEntryPoint = new RunnerEntryPoint(setupRunnerContainer());
    await runnerEntryPoint.start();
})().catch(() => {
    process.exit(1);
});
