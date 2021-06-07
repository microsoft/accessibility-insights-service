// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
// eslint-disable-next-line import/no-unassigned-import
import './module-name-mapper';
// @ts-ignore
import * as cheerio from 'cheerio';

import { System } from 'common';
import { setupWebApiScanRunnerContainer } from './setup-web-api-scan-runner-container';
import { WebApiScanRunnerEntryPoint } from './web-api-scan-runner-entry-point';

(async () => {
    await new WebApiScanRunnerEntryPoint(setupWebApiScanRunnerContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
