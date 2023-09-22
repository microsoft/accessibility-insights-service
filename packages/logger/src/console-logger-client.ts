// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { BaseConsoleLoggerClient } from './base-console-logger-client';
import { LoggerProperties } from './logger-client';

@injectable()
export class ConsoleLoggerClient extends BaseConsoleLoggerClient {
    protected getPropertiesToAddToEvent(): LoggerProperties {
        return {};
    }
}
