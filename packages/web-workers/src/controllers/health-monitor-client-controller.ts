// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { WebController } from 'service-library';

// tslint:disable: no-any

@injectable()
export class HealthMonitorClientController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-client';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(...args: any[]): Promise<void> {
        this.logger.logInfo(`Executing ${args[0]} activity action.`);
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }
}
