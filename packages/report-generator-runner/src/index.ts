// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { System } from 'common';
import { setupReportGeneratorRunnerContainer } from './setup-report-generator-runner-container';
import { ReportGeneratorRunnerEntryPoint } from './report-generator-runner-entry-point';

(async () => {
    await new ReportGeneratorRunnerEntryPoint(setupReportGeneratorRunnerContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
