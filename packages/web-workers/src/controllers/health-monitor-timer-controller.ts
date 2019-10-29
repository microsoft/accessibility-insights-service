// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as df from 'durable-functions';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { WebController } from 'service-library';
import { FunctionTimer } from '../contracts/function-timer';

// tslint:disable: no-any

@injectable()
export class HealthMonitorTimerController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-timer';
    private readonly orchestrationFuncName = 'health-monitor-orchestration-func';

    public constructor(@inject(Logger) protected readonly logger: Logger) {
        super();
    }

    public async handleRequest(...args: any[]): Promise<void> {
        const funcTimer = <FunctionTimer>args[0];
        this.logger.logInfo(`Executing '${this.context.executionContext.functionName}' function.`, {
            funcName: this.context.executionContext.functionName,
            invocationId: this.context.executionContext.invocationId,
            isPastDue: funcTimer.IsPastDue.toString(),
        });

        const dfClient = df.getClient(this.context);
        const instanceId = await dfClient.startNew(this.orchestrationFuncName);
        this.logger.logInfo(`Started new '${this.orchestrationFuncName}' orchestration function instance.`, { instanceId: instanceId });

        console.log(JSON.stringify(dfClient.createCheckStatusResponse(this.context.req, instanceId)));
    }

    protected validateRequest(...args: any[]): boolean {
        if ((<FunctionTimer>args[0]).IsPastDue) {
            this.logger.logWarn(`The '${this.context.executionContext.functionName}' function trigger is past due.`);
        }

        return true;
    }
}
