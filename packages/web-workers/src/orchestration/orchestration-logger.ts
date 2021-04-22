// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { Logger, LogLevel } from 'logger';
import { OrchestrationTelemetryProperties } from '../orchestration-steps';

export class OrchestrationLogger {
    constructor(private readonly context: IOrchestrationFunctionContext, private readonly logger: Logger) {}

    public logOrchestrationStep(message: string, logType: LogLevel = LogLevel.info, properties?: OrchestrationTelemetryProperties): void {
        this.logger.log(message, logType, {
            ...this.getDefaultLogProperties(),
            ...properties,
        });
    }

    private getDefaultLogProperties(): OrchestrationTelemetryProperties {
        return {
            instanceId: this.context.df.instanceId,
            isReplaying: this.context.df.isReplaying.toString(),
            currentUtcDateTime: this.context.df.currentUtcDateTime.toUTCString(),
        };
    }
}
