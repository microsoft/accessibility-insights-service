// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as convict from 'convict';
import * as fs from 'fs';
import { injectable } from 'inversify';
import { isNil } from 'lodash';

export interface TaskRuntimeConfig {
    taskTimeoutInMinutes: number;
}

export interface QueueRuntimeConfig {
    maxQueueSize: number;
}

export interface LogRuntimeConfig {
    logInConsole: boolean;
}

export interface ScanRunTimeConfig {
    minLastReferenceSeenInDays: number;
    pageRescanIntervalInDays: number;
    failedPageRescanIntervalInHours: number;
    maxScanRetryCount: number;
}

export interface RuntimeConfig {
    logConfig: LogRuntimeConfig;
    taskConfig: TaskRuntimeConfig;
    queueConfig: QueueRuntimeConfig;
    scanConfig: ScanRunTimeConfig;
}

@injectable()
export class ServiceConfiguration {
    public static readonly profilePath = './runtime-config/runtime-config.json';
    private readonly fileSystem: typeof fs;
    private loadConfigPromise: Promise<convict.Config<RuntimeConfig>>;
    private readonly convictModule: typeof convict;

    constructor(fileSystem: typeof fs = fs, convictModule: typeof convict) {
        this.fileSystem = fileSystem;
        this.convictModule = convictModule;
    }

    public async getConfigValue<K extends keyof RuntimeConfig | null | undefined = undefined>(
        key?: K,
    ): Promise<K extends null | undefined ? RuntimeConfig : RuntimeConfig[K]> {
        const config = await this.getConvictConfig();

        return config.get(key);
    }

    private async getConvictConfig(): Promise<convict.Config<RuntimeConfig>> {
        if (isNil(this.loadConfigPromise)) {
            this.loadConfigPromise = new Promise((resolve, reject) => {
                const config = this.convictModule<RuntimeConfig>(this.getRuntimeConfigSchema());

                this.fileSystem.exists(ServiceConfiguration.profilePath, exists => {
                    if (exists === true) {
                        config.loadFile(ServiceConfiguration.profilePath);
                        config.validate({ allowed: 'strict' });
                    } else {
                        console.log(`Unable to load custom configuration. Using default config  - ${config}`);
                    }
                    resolve(config);
                });
            });
        }

        return this.loadConfigPromise;
    }

    private getRuntimeConfigSchema(): convict.Schema<RuntimeConfig> {
        return {
            logConfig: {
                logInConsole: {
                    format: 'Boolean',
                    default: true,
                    doc: 'Property to decide if console logging is enabled',
                },
            },
            queueConfig: {
                maxQueueSize: {
                    format: 'int',
                    default: 10,
                    doc: 'Maximum message the queue can have',
                },
            },
            taskConfig: {
                taskTimeoutInMinutes: {
                    format: 'int',
                    default: 3,
                    doc: 'Timeout value after which the task has to be terminated',
                },
            },

            scanConfig: {
                minLastReferenceSeenInDays: {
                    format: 'int',
                    default: 3,
                    doc: 'Minimum days since we last saw a page. Pages older than this time will not be scanned.',
                },
                pageRescanIntervalInDays: {
                    format: 'int',
                    default: 3,
                    doc: 'Minimum days since we last scanned. Pages newer than this time will not be scanned.',
                },
                failedPageRescanIntervalInHours: {
                    format: 'int',
                    default: 3,
                    doc: 'Minimum hours since the last scan failed. Pages newer than this time will not be scanned.',
                },
                maxScanRetryCount: {
                    format: 'int',
                    default: 3,
                    doc: 'Maximum number of retries allowed for a page scan',
                },
            },
        };
    }
}
