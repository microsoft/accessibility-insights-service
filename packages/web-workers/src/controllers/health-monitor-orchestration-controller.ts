// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebController } from 'service-library';

// tslint:disable: no-any

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-orchestration';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
    ) {
        super(contextAwareLogger);
    }

    public async handleRequest(...args: any[]): Promise<void> {
        return;
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }
}
