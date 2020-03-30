// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Logger } from './logger';
import { LoggerClient } from './logger-client';

export class ContextAwareLogger extends Logger {
    constructor(loggerClients: LoggerClient[], currentProcess: typeof process) {
        super(loggerClients, currentProcess);
    }
}
