// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { BaseLogger } from './base-logger';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LoggerClient } from './logger-client';

@injectable()
export class Logger extends BaseLogger {
    constructor(loggerClients: LoggerClient[], currentProcess: typeof process) {
        super(loggerClients, currentProcess);
    }

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        await super.setup(baseProperties);
    }
}
