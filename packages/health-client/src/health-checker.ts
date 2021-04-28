// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ensureDirectory, ResponseWithBodyType, ServiceConfiguration, System } from 'common';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import { HealthReport, TestRunResult } from 'service-library';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';
import * as yargs from 'yargs';
import _ from 'lodash';
import { ScanReportDownloader } from './scan-report-downloader';

/* eslint-disable radix, @typescript-eslint/no-explicit-any, @typescript-eslint/strict-boolean-expressions */
type Argv = {
    clientId: string;
    clientSecret: string;
    authorityUrl: string;
    waitTimeBeforeEvaluationInMinutes: string;
    evaluationIntervalInMinutes: string;
    releaseId: string;
    baseUrl: string;
    reportDownloadDest: string;
};

const testTimeoutInMinutes = 75;
const argv: Argv = yargs.argv as any;

(async () => {
    const logger = new GlobalLogger([new ConsoleLoggerClient(new ServiceConfiguration(), console)], process);
    await logger.setup();

    const isTestTimeout = (startTime: Date, currentTime: Date, timeout: number): boolean => {
        return currentTime.getTime() - startTime.getTime() > timeout;
    };
    const serviceCredential = new A11yServiceCredential(argv.clientId, argv.clientSecret, argv.clientId, argv.authorityUrl, logger);
    const client = new A11yServiceClient(serviceCredential, argv.baseUrl, logger);
    const waitTimeBeforeEvaluation = parseInt(argv.waitTimeBeforeEvaluationInMinutes) * 60000;
    const evaluationInterval = parseInt(argv.evaluationIntervalInMinutes) * 60000;

    logger.logInfo('Start evaluation of functional tests result.');
    logger.logInfo(`Waiting for ${argv.waitTimeBeforeEvaluationInMinutes} minutes before evaluating functional tests result.`);
    await System.wait(waitTimeBeforeEvaluation);

    let healthStatus: TestRunResult;
    let response: ResponseWithBodyType<HealthReport>;
    const startTime = new Date();
    while (healthStatus !== 'pass') {
        try {
            logger.logInfo('Retrieving functional tests result.');

            response = await client.checkHealth(`/release/${argv.releaseId}`);
            if (response.statusCode !== 200) {
                throw new Error(
                    JSON.stringify({ statusCode: response.statusCode, statusMessage: response.statusMessage, body: response.body }),
                );
            }

            healthStatus = response.body.healthStatus;
            logger.logInfo(`Functional tests result: ${JSON.stringify(response.body)}`);
        } catch (error) {
            logger.logInfo(`Failed to retrieve functional tests result. ${System.serializeError(error)}`);
        }

        if (healthStatus !== 'pass') {
            if (isTestTimeout(startTime, new Date(), testTimeoutInMinutes * 60000)) {
                logger.logInfo('Functional tests result validation timed out.');
                throw new Error('Functional tests result validation timed out.');
            }

            logger.logInfo(
                `Functional tests health status: ${healthStatus ? healthStatus : 'unknown'} . Waiting for next evaluation result.`,
            );

            await System.wait(evaluationInterval);
        } else {
            logger.logInfo('Functional tests succeeded.');

            logger.logInfo('Downloading E2E scan reports...');
            const uniqueScanTestRuns = _.compact(_.uniqBy(response.body.testRuns, (testRun) => testRun.scanId));
            const directory = ensureDirectory(argv.reportDownloadDest);
            const reportDownloader = new ScanReportDownloader(client, directory, logger);
            await Promise.all(
                uniqueScanTestRuns.map((testRun) => {
                    const scanId = testRun.scanId;
                    const scenarioName = testRun.scenarioName;

                    // make sure directory exists!
                    return reportDownloader.downloadReportsForScan(scanId, scenarioName);
                }),
            );
            logger.logInfo('All reports downloaded.');
        }
    }
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
