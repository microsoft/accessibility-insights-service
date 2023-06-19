// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Logger } from './logger';
import { LoggerClient } from './logger-client';

export class GlobalLogger extends Logger {
    constructor(loggerClients: LoggerClient[], initializationTimeout: number = 5000) {
        super(loggerClients, initializationTimeout);
    }
}
