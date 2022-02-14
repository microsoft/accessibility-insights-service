// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { ReportGeneratorJobManagerEntryPoint } from './report-generator-job-manager-entry-point';
import { setupReportGeneratorJobManagerContainer } from './setup-report-generator-job-manager-container';

(async () => {
    const webApiJobManagerEntryPoint = new ReportGeneratorJobManagerEntryPoint(setupReportGeneratorJobManagerContainer());
    await webApiJobManagerEntryPoint.start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
