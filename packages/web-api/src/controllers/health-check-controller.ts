// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ApplicationInsightsQueryResponse, Column, ResponseWithBodyType } from 'azure-services';
import { AvailabilityTestConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController, HealthReport, HttpResponse, TestEnvironment, TestRun, TestRunResult, WebApiErrorCodes } from 'service-library';
import { ApplicationInsightsClientProvider, webApiTypeNames } from '../web-api-types';

// tslint:disable: max-line-length

export declare type HealthTarget = 'release';

@injectable()
export class HealthCheckController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-health-check';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
        @inject(webApiTypeNames.ApplicationInsightsClientProvider)
        protected readonly appInsightsClientProvider: ApplicationInsightsClientProvider,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        this.logger.trackEvent('HealthCheck');

        const target: HealthTarget = this.context.bindingData.target as HealthTarget;
        if (target === undefined) {
            this.processEchoHealthRequest();
        } else if (target === 'release') {
            await this.processReleaseHealthRequest();
        } else {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound);
        }
    }

    // Override this method not to check api version
    protected validateApiVersion(): boolean {
        return true;
    }

    private async processReleaseHealthRequest(): Promise<void> {
        const releaseId = this.getReleaseId();
        if (releaseId === undefined) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.missingReleaseVersion);

            return;
        }

        const queryResponse = await this.executeAppInsightsQuery(releaseId);
        if (queryResponse.statusCode !== 200) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);

            return;
        }

        const healthReport = this.getHealthReport(queryResponse.body, releaseId);

        this.context.res = {
            status: 200, // OK
            body: healthReport,
        };
    }

    private async executeAppInsightsQuery(releaseId: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const appInsightsClient = await this.appInsightsClientProvider();
        const logQueryTimeRange = (await this.getAvailabilityTestConfig()).logQueryTimeRange;
        const queryString = `customEvents
        | where name == "FunctionalTest" and customDimensions.logSource == "TestRun" and customDimensions.releaseId == "${releaseId}"
        and customDimensions.runId == toscalar(
            customEvents
            | where name == "FunctionalTest" and customDimensions.testContainer == "FinalizerTestGroup" and customDimensions.releaseId == "${releaseId}"
            | top 1 by timestamp desc nulls last
            | project tostring(customDimensions.runId)
        )
        | project timestamp, environment = customDimensions.environment, releaseId = customDimensions.releaseId, runId = customDimensions.runId,
                  logSource = customDimensions.logSource, testContainer = customDimensions.testContainer, testName = customDimensions.testName,
                  result = customDimensions.result, error = customDimensions.error
        | order by timestamp asc nulls last`;
        const queryResponse = await appInsightsClient.executeQuery(queryString, logQueryTimeRange);
        if (queryResponse.statusCode === 200) {
            this.logger.logInfo('App Insights query succeeded', {
                query: queryString,
                statusCode: queryResponse.statusCode.toString(),
                response: JSON.stringify(queryResponse),
            });
        } else {
            this.logger.logError('App Insights query failed', {
                query: queryString,
                statusCode: queryResponse.statusCode.toString(),
                response: JSON.stringify(queryResponse),
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
        table.rows.forEach(row => {
            const result = this.getColumnValue(columns, row, 'result') as TestRunResult;
            if (result === 'pass') {
                testsPassed += 1;
            } else {
                testsFailed += 1;
            }

            const testRun: TestRun = {
                testContainer: this.getColumnValue(columns, row, 'testContainer'),
                testName: this.getColumnValue(columns, row, 'testName'),
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

        return {
            healthStatus: testsFailed === 0 ? 'pass' : 'fail',
            environment: environment,
            releaseId: releaseId,
            runId: runId,
            testRuns: testRuns,
            testsPassed: testsPassed,
            testsFailed: testsFailed,
        };
    }

    private getReleaseId(): string {
        const releaseId = <string>this.context.bindingData.targetId;

        return releaseId !== undefined ? releaseId : process.env.RELEASE_VERSION;
    }

    private processEchoHealthRequest(): void {
        this.context.res = {
            status: 200, // OK
        };
    }

    private getColumnValue(columns: Column[], row: string[], columnName: string): string {
        const index = columns.findIndex(c => c.name === columnName);

        return index > -1 && row !== undefined && row.length > index ? row[columns.findIndex(c => c.name === columnName)] : undefined;
    }

    private async getAvailabilityTestConfig(): Promise<AvailabilityTestConfig> {
        return this.serviceConfig.getConfigValue('availabilityTestConfig');
    }
}
