// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController, HealthReport } from 'service-library';

@injectable()
export class HealthCheckController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-health-check';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
    ) {
        super(logger);
    }

    public async handleRequest(): Promise<void> {
        this.logger.trackEvent('HealthCheck');

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
