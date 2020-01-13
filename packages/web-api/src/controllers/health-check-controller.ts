// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ApplicationInsightsClient, ApplicationInsightsQueryResponse, ResponseWithBodyType } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { functionalTestGroupTypes } from 'functional-tests';
import { inject, injectable } from 'inversify';
import { groupBy } from 'lodash';
import { Logger } from 'logger';
import { ApiController, HealthReport, HttpResponse, TestRun, TestRunResult, WebApiErrorCodes } from 'service-library';

import { ApplicationInsightsClientProvider, webApiTypeNames } from '../web-api-types';

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
        const targetId = this.getTargetId();
        if (targetId === undefined) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.missingReleaseVersion);

            return;
        }

        const queryResponse = await this.executeAppInsightsQuery(targetId);
        if (queryResponse.statusCode !== 200) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.internalError);

            return;
        }

        const healthReport: HealthReport = this.getHealthReport(queryResponse.body, targetId);

        this.context.res = {
            status: 200, // OK
            body: healthReport,
        };
    }

    private async executeAppInsightsQuery(targetId: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const appInsightsClient = await this.appInsightsClientProvider();
        const e2eTestConfig = await this.serviceConfig.getConfigValue('e2eTestConfig');
        const queryString = `customEvents
            | where name == "FunctionalTest" and customDimensions.releaseId == ${targetId}
            | project timeCompleted = timestamp, name = customDimensions.testContainer, lastRunResult = customDimensions.result
            | limit 500`;
        const queryResponse = await appInsightsClient.executeQuery(queryString, e2eTestConfig.testRunQueryTimespan);
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

    private getTargetId(): string {
        const targetId = <string>this.context.bindingData.targetId;

        return targetId !== undefined ? targetId : process.env.RELEASE_VERSION;
    }

    private processEchoHealthRequest(): void {
        this.context.res = {
            status: 200, // OK
        };
    }

    private getHealthReport(queryResponse: ApplicationInsightsQueryResponse, targetId: string): HealthReport {
        const testContainers: string[] = Object.values(functionalTestGroupTypes).map(ctor => ctor.name);
        const testRuns: TestRun[] = [];
        queryResponse.tables[0].rows.forEach((testRecord: string[]) => {
            testRuns.push({
                timeCompleted: new Date(testRecord[0]),
                name: testRecord[1],
                lastRunResult: testRecord[2] as TestRunResult,
            });
        });

        const groupedTestRuns = groupBy(testRuns, testRun => testRun.name);
        let testsPassed: number = 0;
        let testsFailed: number = 0;
        testContainers.forEach(name => {
            if (groupedTestRuns[name] === undefined) {
                testsFailed += 1;
            } else {
                const testContainerPassed = groupedTestRuns[name].every(testRun => testRun.lastRunResult === 'pass');
                testContainerPassed ? (testsPassed += 1) : (testsFailed += 1);
            }
        });

        return {
            buildVersion: targetId,
            testRuns,
            testsFailed,
            testsPassed,
        };
    }
}
