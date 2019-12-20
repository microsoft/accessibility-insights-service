// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BaseTelemetryProperties } from './base-telemetry-properties';
import { Logger } from './logger';
import { LoggerClient } from './logger-client';

export class GlobalLogger extends Logger {
    constructor(loggerClients: LoggerClient[], currentProcess: typeof process) {
        super(loggerClients, currentProcess);
    }

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        await super.setup(baseProperties);
    }
}
