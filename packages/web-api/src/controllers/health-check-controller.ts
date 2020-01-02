// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ApplicationInsightsClient } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController, HealthReport } from 'service-library';
import { ApplicationInsightsClientProvider, webApiTypeNames } from '../web-api-types';

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

        const appInsightsClient = await this.appInsightsClientProvider();

        const healthReport: HealthReport = {
            buildVersion: '0.0.0',
            testRuns: [],
            testsPassed: 0,
            testsFailed: 0,
        };

        const e2eTestConfig = await this.serviceConfig.getConfigValue('e2eTestConfig');
        const queryString = 'customEvents | limit 5';
        const queryResponse = await appInsightsClient.executeQuery(queryString, e2eTestConfig.testRunQueryTimespan);
        if (queryResponse.statusCode === 200) {
            this.logger.logInfo(`App insights api queried with result ${JSON.stringify(queryResponse)}`);
        } else {
            healthReport.error = `App insights api query failed with status ${queryResponse.statusCode}`;
        }

        this.context.res = {
            status: 200, // OK
            body: healthReport,
        };
    }

    // Override this method not to check api version
    protected validateApiVersion(): boolean {
        return true;
    }
}
