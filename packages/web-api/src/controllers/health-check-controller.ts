// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ApiController } from 'service-library';

@injectable()
export class HealthCheckController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-health-check';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
    ) {
        super(contextAwareLogger);
    }

    public async handleRequest(): Promise<void> {
        this.contextAwareLogger.trackEvent('HealthCheck');
        this.context.res = {
            status: 200, // OK
        };
    }

    // Override this method not to check api version
    protected validateApiVersion(): boolean {
        return true;
    }
}
