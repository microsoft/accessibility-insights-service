// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ResponseWithBodyType, System } from 'common';
import _ from 'lodash';
import { Logger } from 'logger';
import { HealthReport, TestRunResult } from 'service-library';
import { A11yServiceClient } from 'web-api-client';
import { ScanReportDownloader } from './scan-report-downloader';

export class DeploymentHealthChecker {
    public constructor(
        private readonly logger: Logger,
        private readonly client: A11yServiceClient,
        private readonly reportDownloader: ScanReportDownloader,
        private readonly waitFunc: (timeoutMilliseconds: number) => Promise<void> = System.wait,
        private readonly getCurrentTime: () => Date = () => new Date(),
    ) {}

    public async run(
        testTimeoutInMinutes: number,
        waitTimeBeforeEvaluationInMinutes: number,
        evaluationIntervalInMinutes: number,
        releaseId: string,
    ): Promise<void> {
        this.logger.logInfo('Start evaluation of functional tests result.');
        this.logger.logInfo(`Waiting for ${waitTimeBeforeEvaluationInMinutes} minutes before evaluating functional tests result.`);
        await this.waitFunc(this.minutesToMilliseconds(waitTimeBeforeEvaluationInMinutes));

        let healthStatus: TestRunResult;
        let response: ResponseWithBodyType<HealthReport>;
        const startTime = this.getCurrentTime();
        while (healthStatus !== 'pass') {
            try {
                this.logger.logInfo('Retrieving functional tests result.');

                response = await this.client.checkHealth(`/release/${releaseId}`);
                if (response.statusCode !== 200) {
                    throw new Error(
                        JSON.stringify({ statusCode: response.statusCode, statusMessage: response.statusMessage, body: response.body }),
                    );
                }

                healthStatus = response.body.healthStatus;
                this.logger.logInfo(`Functional tests result: ${JSON.stringify(response.body)}`);
            } catch (error) {
                this.logger.logInfo(`Failed to retrieve functional tests result. ${System.serializeError(error)}`);
            }

            if (healthStatus !== 'pass') {
                if (this.isTestTimeout(startTime, testTimeoutInMinutes)) {
                    this.logger.logInfo('Functional tests result validation timed out.');
                    throw new Error('Functional tests result validation timed out.');
                }

                this.logger.logInfo(
                    `Functional tests health status: ${healthStatus ? healthStatus : 'unknown'} . Waiting for next evaluation result.`,
                );

                await this.waitFunc(this.minutesToMilliseconds(evaluationIntervalInMinutes));
            } else {
                this.logger.logInfo('Functional tests succeeded.');
                await this.downloadAllReports(response.body);
            }
        }
    }

    private isTestTimeout(startTime: Date, testTimeoutInMinutes: number): boolean {
        const currentTime = this.getCurrentTime();

        return currentTime.getTime() - startTime.getTime() > testTimeoutInMinutes * 60000;
    }

    private minutesToMilliseconds(minutes: number): number {
        return minutes * 60000;
    }

    private async downloadAllReports(healthReport: HealthReport): Promise<void> {
        this.logger.logInfo('Downloading E2E scan reports...');
        const uniqueScanTestRuns = _.compact(_.uniqBy(healthReport.testRuns, (testRun) => testRun.scanId));
        await Promise.all(
            uniqueScanTestRuns.map((testRun) => {
                const scanId = testRun.scanId;
                const scenarioName = testRun.scenarioName;

                return this.reportDownloader.downloadReportsForScan(scanId, scenarioName);
            }),
        );
        this.logger.logInfo('All reports downloaded.');
    }
}
