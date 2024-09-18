// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as df from 'durable-functions';
import { Logger, LogLevel } from 'logger';
import { OrchestrationTelemetryProperties } from './orchestration-telemetry-properties';

export class OrchestrationLogger {
    constructor(private readonly context: df.OrchestrationContext, private readonly logger: Logger) {}

    public logOrchestrationStep(message: string, logType: LogLevel = LogLevel.Info, properties?: OrchestrationTelemetryProperties): void {
        this.logger.log(message, logType, {
            ...this.getDefaultLogProperties(),
            ...properties,
        });
    }

    private getDefaultLogProperties(): OrchestrationTelemetryProperties {
        return {
            instanceId: this.context.df.instanceId,
            isReplaying: (this.context.df.isReplaying ?? false).toString(),
            currentUtcDateTime: this.context.df.currentUtcDateTime.toUTCString(),
        };
    }
}
