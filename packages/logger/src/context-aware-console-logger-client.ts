// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ServiceConfiguration } from 'common';
import { inject, injectable, optional } from 'inversify';
import { BaseConsoleLoggerClient } from './base-console-logger-client';
import { ConsoleLoggerClient } from './console-logger-client';
import { loggerTypes } from './logger-types';
import { LoggerProperties } from './logger-client';

@injectable()
export class ContextAwareConsoleLoggerClient extends BaseConsoleLoggerClient {
    constructor(
        @optional() @inject('ServiceConfiguration') protected readonly serviceConfig: ServiceConfiguration,
        @optional() @inject(loggerTypes.Console) protected readonly consoleObject: typeof console,
        @optional() @inject('ConsoleLoggerClient') private readonly rootLoggerClient: ConsoleLoggerClient,
    ) {
        super(serviceConfig, consoleObject);
    }

    protected getPropertiesToAddToEvent(): LoggerProperties {
        return { ...this.rootLoggerClient.getCommonProperties() };
    }
}
