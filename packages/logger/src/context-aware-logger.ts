// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { BaseLogger } from './base-logger';
import { LoggerClient } from './logger-client';

@injectable()
export class ContextAwareLogger extends BaseLogger {
    constructor(loggerClients: LoggerClient[], currentProcess: typeof process) {
        super(loggerClients, currentProcess);
    }
}
