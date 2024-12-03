// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, optional } from 'inversify';
import { Logger } from './logger';
import { LoggerClient } from './logger-client';

export class ContextAwareLogger extends Logger {
    constructor(@optional() @inject('LoggerClient[]') loggerClients: LoggerClient[]) {
        super(loggerClients);
    }
}
