// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration, System } from 'common';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';
import * as yargs from 'yargs';
import _ from 'lodash';
import { ScanReportDownloader } from './scan-report-downloader';
import { DeploymentHealthChecker } from './deployment-health-checker';

/* eslint-disable radix, @typescript-eslint/no-explicit-any, @typescript-eslint/strict-boolean-expressions */
type Argv = {
    clientId: string;
    clientSecret: string;
    authorityUrl: string;
    waitTimeBeforeEvaluationInMinutes: string;
    evaluationIntervalInMinutes: string;
    releaseId: string;
    baseUrl: string;
    reportDownloadLocation: string;
};

const testTimeoutInMinutes = 75;
const argv: Argv = yargs.argv as any;

(async () => {
    const logger = new GlobalLogger([new ConsoleLoggerClient(new ServiceConfiguration(), console)], process);
    await logger.setup();

    const serviceCredential = new A11yServiceCredential(argv.clientId, argv.clientSecret, argv.clientId, argv.authorityUrl, logger);
    const client = new A11yServiceClient(serviceCredential, argv.baseUrl, logger);

    const reportDownloader = new ScanReportDownloader(client, argv.reportDownloadLocation, logger);

    const waitTimeBeforeEvaluationInMinutes = parseInt(argv.waitTimeBeforeEvaluationInMinutes);
    const evaluationIntervalInMinutes = parseInt(argv.evaluationIntervalInMinutes);

    const deploymentHealthChecker = new DeploymentHealthChecker(logger, client, reportDownloader);

    await deploymentHealthChecker.run(testTimeoutInMinutes, waitTimeBeforeEvaluationInMinutes, evaluationIntervalInMinutes, argv.releaseId);
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
