// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { injectable } from 'inversify';
import { isNil } from 'lodash';
import * as path from 'path';
import * as defaultConfig from './runtime-config/runtime-config.dev.json';

@injectable()
export class ServiceConfiguration {
    public static readonly profilePath = './runtime-config/runtime-config.json';
    public static readonly devProfilePath = path.resolve(__dirname, 'runtime-config/runtime-config.dev.json');
    public config: typeof defaultConfig;
    private readonly fileSystem: typeof fs;

    constructor(fileSystem: typeof fs = fs) {
        this.fileSystem = fileSystem;
    }

    public async getConfig(): Promise<typeof defaultConfig> {
        if (isNil(this.config)) {
            this.config = await this.getProfileConfigFromFile(ServiceConfiguration.profilePath);

            if (isNil(this.config)) {
                console.log('Unable to find runtime configuration file. Using dev configuration');
                this.config = await this.getProfileConfigFromFile(ServiceConfiguration.devProfilePath);
                console.log(`dev configuration used - ${JSON.stringify(this.config)}`);
            }
        }

        return this.config;
    }

    private async getProfileConfigFromFile(configPath: string): Promise<typeof defaultConfig> {
        return new Promise<typeof defaultConfig>((resolve, reject) => {
            this.fileSystem.exists(configPath, (exists: boolean) => {
                if (exists === true) {
                    this.fileSystem.readFile(configPath, (err, buffer) => {
                        if (isNil(err)) {
                            const config = JSON.parse(buffer.toString('utf-8')) as typeof defaultConfig;
                            resolve(config);
                        } else {
                            reject(err);
                        }
                    });
                } else {
                    resolve(undefined);
                }
            });
        });
    }
}
