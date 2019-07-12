// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { injectable } from 'inversify';
import { isNil } from 'lodash';
import * as defaultConfig from './runtime-config/runtime-config.dev.json';

@injectable()
export class ServiceConfiguration {
    public static readonly profilePath = './runtime-configuration/runtime-configuration.json';
    public config: typeof defaultConfig;
    private readonly fsObj: typeof fs;

    constructor(fsObj: typeof fs = fs) {
        this.fsObj = fsObj;
    }

    public async getConfig(): Promise<typeof defaultConfig> {
        if (isNil(this.config)) {
            const fetchConfigPromise = new Promise((resolve, reject) => {
                this.fsObj.exists(ServiceConfiguration.profilePath, (exists: boolean) => {
                    if (exists === true) {
                        this.fsObj.readFile(ServiceConfiguration.profilePath, (err, buffer) => {
                            if (isNil(err)) {
                                this.config = JSON.parse(buffer.toString('utf-8')) as typeof defaultConfig;
                                resolve();
                            } else {
                                reject(err);
                            }
                        });
                    } else {
                        console.log('Unable to find runtime configuration file. Using dev configuration');
                        this.config = defaultConfig;
                        resolve();
                    }
                });
            });

            await fetchConfigPromise;
        }

        return this.config;
    }
}
