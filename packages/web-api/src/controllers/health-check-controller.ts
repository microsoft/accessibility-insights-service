// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ApplicationInsightsQueryResponse, Column } from 'azure-services';
import { AvailabilityTestConfig, getSerializableResponse, ResponseWithBodyType, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import {
    ApiController,
    HealthReport,
    WebHttpResponse,
    TestEnvironment,
    TestRun,
    TestRunResult,
    WebApiErrorCodes,
    WebApiErrorCode,
} from 'service-library';
import { HttpResponseInit } from '@azure/functions';
import { isEmpty } from 'lodash';
import { createHealthCheckQueryForRelease } from '../health-check-query';
import { ApplicationInsightsClientProvider, webApiTypeNames } from '../web-api-types';

export declare type HealthTarget = 'release';

@injectable()
export class HealthCheckController extends ApiController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'web-api-health-check';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) protected readonly logger: GlobalLogger,
        @inject(webApiTypeNames.ApplicationInsightsClientProvider)
        protected readonly appInsightsClientProvider: ApplicationInsightsClientProvider,
        protected readonly createQueryForRelease: typeof createHealthCheckQueryForRelease = createHealthCheckQueryForRelease,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<HttpResponseInit> {
        this.logger.trackEvent('HealthCheck');
        this.logger.setCommonProperties({ source: 'getHealthCheckReportRESTApi' });

        const target = this.appContext.request.params.target;
        if (isEmpty(target)) {
            return this.processEchoHealthRequest();
        }

        if (target === 'release') {
            return this.processReleaseHealthRequest();
        }

        return WebHttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
    }

    protected validateApiVersion(): WebApiErrorCode {
        return undefined;
    }

    private async processReleaseHealthRequest(): Promise<HttpResponseInit> {
        const releaseId = this.getReleaseId();
        if (releaseId === undefined) {
            return WebHttpResponse.getErrorResponse(WebApiErrorCodes.missingReleaseVersion);
        }

        const queryResponse = await this.executeAppInsightsQuery(releaseId);
        if (queryResponse.statusCode !== 200) {
            return WebHttpResponse.getErrorResponse(WebApiErrorCodes.internalError);
        }

        const healthReport = this.getHealthReport(queryResponse.body, releaseId);

        return {
            status: 200,
            jsonBody: healthReport,
        };
    }

    private processEchoHealthRequest(): HttpResponseInit {
        return {
            status: 200,
        };
    }

    private async executeAppInsightsQuery(releaseId: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const appInsightsClient = await this.appInsightsClientProvider();
        const logQueryTimeRange = (await this.getAvailabilityTestConfig()).logQueryTimeRange;
        const queryString = this.createQueryForRelease(releaseId);
        const queryResponse = await appInsightsClient.executeQuery(queryString, logQueryTimeRange);
        if (queryResponse.statusCode === 200) {
            this.logger.logInfo('App Insights query has succeeded.', {
                query: queryString,
                statusCode: queryResponse.statusCode.toString(),
                response: JSON.stringify(getSerializableResponse(queryResponse)),
            });
        } else {
            this.logger.logError('App Insights query has failed.', {
                query: queryString,
                statusCode: queryResponse.statusCode.toString(),
                response: JSON.stringify(getSerializableResponse(queryResponse)),
            });
        }

        return queryResponse;
    }

    private getHealthReport(queryResponse: ApplicationInsightsQueryResponse, releaseId: string): HealthReport {
        const table = queryResponse.tables[0];
        const columns = table.columns;

        let testsPassed = 0;
        let testsFailed = 0;
        const testRuns: TestRun[] = [];
        table.rows.forEach((row) => {
            const result = this.getColumnValue(columns, row, 'result') as TestRunResult;
            if (result === 'pass') {
                testsPassed += 1;
            } else {
                testsFailed += 1;
            }

            const testRun: TestRun = {
                testContainer: this.getColumnValue(columns, row, 'testContainer'),
                testName: this.getColumnValue(columns, row, 'testName'),
                scenarioName: this.getColumnValue(columns, row, 'scenarioName'),
                scanId: this.getColumnValue(columns, row, 'scanId'),
                result: result,
                timestamp: new Date(this.getColumnValue(columns, row, 'timestamp')),
            };

            if (result === 'fail') {
                testRun.error = this.getColumnValue(columns, row, 'error');
            }

            testRuns.push(testRun);
        });

        const environment = this.getColumnValue(columns, table.rows[0], 'environment') as TestEnvironment;
        const runId = this.getColumnValue(columns, table.rows[0], 'runId');
        const healthStatus = testRuns.length > 0 ? (testsFailed === 0 ? 'pass' : 'fail') : 'warn';

        return {
            healthStatus,
            environment: environment,
            releaseId: releaseId,
            runId: runId,
            testRuns: testRuns,
            testsPassed: testsPassed,
            testsFailed: testsFailed,
        };
    }

    private getReleaseId(): string {
        const releaseId = this.appContext.request.params.targetId;

        return isEmpty(releaseId) ? process.env.RELEASE_VERSION : releaseId;
    }

    private getColumnValue(columns: Column[], row: string[], columnName: string): string {
        const index = columns.findIndex((c) => c.name === columnName);

        return index > -1 && row !== undefined && row.length > index ? row[columns.findIndex((c) => c.name === columnName)] : undefined;
    }

    private async getAvailabilityTestConfig(): Promise<AvailabilityTestConfig> {
        return this.serviceConfig.getConfigValue('availabilityTestConfig');
    }
}
