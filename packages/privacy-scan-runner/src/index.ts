// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { setupPrivacyScanRunnerContainer } from './setup-privacy-scan-runner-container';
import { PrivacyScanRunnerEntryPoint } from './privacy-scan-runner-entry-point';

(async () => {
    await new PrivacyScanRunnerEntryPoint(setupPrivacyScanRunnerContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
