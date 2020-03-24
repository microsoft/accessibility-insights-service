// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { commonIocTypes } from '../common-ioc-types';
import { System } from './system';

@injectable()
export class EnvironmentSettings {
    constructor(@inject(commonIocTypes.Process) private readonly currentProcess: typeof process) {}

    public tryGetValue(key: string): string {
        return this.currentProcess.env[key];
    }

    public getValue(key: string): string {
        const value = this.tryGetValue(key);

        if (System.isNullOrEmptyString(value)) {
            throw new Error(`Unable to get environment property value for ${key}`);
        }

        return value;
    }
}
