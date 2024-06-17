// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration, System } from 'common';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';
import * as yargs from 'yargs';
import * as dotenv from 'dotenv';
import { ScanReportDownloader } from './scan-report-downloader';
import { DeploymentHealthChecker } from './deployment-health-checker';

/* eslint-disable radix, @typescript-eslint/no-explicit-any, @typescript-eslint/strict-boolean-expressions */

type Argv = {
    scope: string;
    clientId: string;
    token: string;
    releaseId: string;
    baseUrl: string;
    reportDownloadLocation: string;
    waitTimeBeforeEvaluationInMinutes: number;
    evaluationIntervalInMinutes: number;
    testsEvaluationTimeoutInMinutes: number;
};

const argv: Argv = yargs
    .options({
        scope: {
            type: 'string',
            describe: 'The App ID or URI of the target resource.',
        },
        clientId: {
            type: 'string',
            describe: 'The Client ID that identifies the managed identity to get the access token.',
        },
        token: {
            type: 'string',
            describe: 'The access token. The Client ID option is not used when the access token is given.',
        },
        releaseId: {
            type: 'string',
            describe: 'The release ID to evaluate E2E tests.',
        },
        baseUrl: {
            type: 'string',
            describe: 'The service endpoint base URL.',
        },
        reportDownloadLocation: {
            type: 'string',
            describe: 'The report download location.',
        },
        waitTimeBeforeEvaluationInMinutes: {
            type: 'number',
            describe: 'The wait time before evaluation, minutes.',
            default: 0,
        },
        evaluationIntervalInMinutes: {
            type: 'number',
            describe: 'The evaluation interval, minutes.',
            default: 2,
        },
        testsEvaluationTimeoutInMinutes: {
            type: 'number',
            describe: 'The E2E tests evaluation timeout, minutes.',
            default: 75,
        },
    })
    .describe('help', 'Show help').argv as any;

(async () => {
    dotenv.config();

    const help = await yargs.getHelp();
    console.log(help);

    const logger = new GlobalLogger([new ConsoleLoggerClient(new ServiceConfiguration(), console)]);
    await logger.setup();

    const serviceCredential = new A11yServiceCredential(argv.scope, argv.clientId, argv.token);
    const client = new A11yServiceClient(serviceCredential, argv.baseUrl);

    const reportDownloader = new ScanReportDownloader(client, argv.reportDownloadLocation, logger);

    const waitTimeBeforeEvaluationInMinutes = argv.waitTimeBeforeEvaluationInMinutes;
    const evaluationIntervalInMinutes = argv.evaluationIntervalInMinutes;

    const deploymentHealthChecker = new DeploymentHealthChecker(logger, client, reportDownloader);

    await deploymentHealthChecker.run(
        argv.testsEvaluationTimeoutInMinutes,
        waitTimeBeforeEvaluationInMinutes,
        evaluationIntervalInMinutes,
        argv.releaseId,
    );
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
