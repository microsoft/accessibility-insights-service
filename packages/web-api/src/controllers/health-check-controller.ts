// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ApplicationInsightsClient } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController, HealthReport } from 'service-library';
import { webApiTypeNames } from '../web-api-types';

@injectable()
export class HealthCheckController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-health-check';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
        @inject(webApiTypeNames.ApplicationInsightsClientProvider) protected readonly appInsightsClient: ApplicationInsightsClient,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        this.logger.trackEvent('HealthCheck');

        this.logger.logInfo(`AppinsightsClient undefined: ${this.appInsightsClient === undefined}`);
        this.logger.logInfo(`AppInsightsClient: ${JSON.stringify(this.appInsightsClient)}`);

        const queryResult = this.appInsightsClient.executeQuery('customEvents | limit 5', 'PT12H');
        this.logger.logInfo(`App insights api queried with result ${JSON.stringify(queryResult)}`);

        const healthReport: HealthReport = {
            buildVersion: '0.0.0',
            testRuns: [],
            testsPassed: 0,
            testsFailed: 0,
        };

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
