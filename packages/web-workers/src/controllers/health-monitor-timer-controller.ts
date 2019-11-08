// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebController } from 'service-library';
import { FunctionTimer } from '../contracts/function-timer';

// tslint:disable: no-any

@injectable()
export class HealthMonitorTimerController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-timer';
    private readonly orchestrationFuncName = 'health-monitor-orchestration-func';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {
        super(contextAwareLogger);
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        const funcTimer = <FunctionTimer>args[0];
        this.contextAwareLogger.logInfo(`Executing '${this.context.executionContext.functionName}' function.`, {
            funcName: this.context.executionContext.functionName,
            invocationId: this.context.executionContext.invocationId,
            isPastDue: funcTimer.IsPastDue.toString(),
        });

        const startArgs = [
            {
                FunctionName: this.orchestrationFuncName,
                InstanceId: this.guidGenerator.createGuid(),
            },
        ];
        this.context.bindings.orchestrationFunc = startArgs;

        this.contextAwareLogger.logInfo(`Started new '${this.orchestrationFuncName}' orchestration function instance.`);
    }

    protected validateRequest(...args: any[]): boolean {
        if ((<FunctionTimer>args[0]).IsPastDue) {
            this.contextAwareLogger.logWarn(`The '${this.context.executionContext.functionName}' function trigger is past due.`);
        }

        return true;
    }
}
