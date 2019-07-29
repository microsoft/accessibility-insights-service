// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { JobManagerEntryPoint } from './job-manager-entry-point';
import { setupJobManagerContainer } from './setup-job-manager-container';

(async () => {
    const jobManagerEntryPoint = new JobManagerEntryPoint(setupJobManagerContainer());
    await jobManagerEntryPoint.start();
})().catch(error => {
    console.log('Exception thrown in job manager: ', error);
    process.exit(1);
});
