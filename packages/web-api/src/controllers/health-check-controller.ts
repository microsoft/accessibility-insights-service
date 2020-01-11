// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ApplicationInsightsQueryResponse, ResponseWithBodyType } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController, HealthReport, HttpResponse, WebApiErrorCodes } from 'service-library';
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

        const healthReport: HealthReport = {
            buildVersion: targetId,
            testRuns: [],
            testsPassed: 0,
            testsFailed: 0,
        };

        this.context.res = {
            status: 200, // OK
            body: healthReport,
        };
    }

    private async executeAppInsightsQuery(targetId: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const appInsightsClient = await this.appInsightsClientProvider();
        const e2eTestConfig = await this.serviceConfig.getConfigValue('e2eTestConfig');
        const queryString = 'customEvents | limit 5';
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
}
