// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as _ from 'lodash';

import { BaseConsoleLoggerClient } from './base-console-logger-client';

@injectable()
export class ConsoleLoggerClient extends BaseConsoleLoggerClient {
    protected getPropertiesToAddToEvent(): { [name: string]: string } {
        return {};
    }
}
