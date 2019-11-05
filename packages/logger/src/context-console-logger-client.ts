// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';

import { ServiceConfiguration } from 'common';
import { BaseConsoleLoggerClient } from './base-console-logger-client';
import { loggerTypes } from './logger-types';
import { RootConsoleLoggerClient } from './root-console-logger-client';

@injectable()
export class ContextConsoleLoggerClient extends BaseConsoleLoggerClient {
    constructor(
        @inject(ServiceConfiguration) serviceConfig: ServiceConfiguration,
        @inject(loggerTypes.Console) consoleObject: typeof console,
        @inject(RootConsoleLoggerClient) private readonly rootLoggerClient: RootConsoleLoggerClient,
    ) {
        super(serviceConfig, consoleObject);
    }

    protected getPropertiesToAddToEvent(): { [name: string]: string } {
        return { ...this.rootLoggerClient.getDefaultProperties() };
    }
}
