// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { PrivacyScanJobManagerEntryPoint } from './privacy-scan-job-manager-entry-point';
import { setupPrivacyScanJobManagerContainer } from './setup-privacy-scan-job-manager-container';

(async () => {
    const webApiJobManagerEntryPoint = new PrivacyScanJobManagerEntryPoint(setupPrivacyScanJobManagerContainer());
    await webApiJobManagerEntryPoint.start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
