// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebApiErrorCode, WebController } from 'service-library';
import * as df from 'durable-functions';
import { orchestrationName } from '../orchestration/orchestration-name';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'health-monitor-orchestration';

    public constructor(@inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger) {
        super(logger);
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'healthMonitorOrchestrationFunc' });

        const client = df.getClient(this.appContext.context);
        const instanceId = await client.startNew(orchestrationName);

        this.logger.logInfo(`Started new ${orchestrationName} orchestration function instance id ${instanceId}.`);
    }

    protected async validateRequest(...args: any[]): Promise<WebApiErrorCode> {
        if (this.appContext.timer?.isPastDue === true) {
            this.logger.logWarn(`The ${this.appContext.context.functionName} timer function missed a scheduled event.`);
        }

        return undefined;
    }
}
