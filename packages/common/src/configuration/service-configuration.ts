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
    messageVisibilityTimeoutInSeconds: number;
}

export interface LogRuntimeConfig {
    logInConsole: boolean;
}

export interface JobManagerConfig {
    activeToRunningTasksRatio: number;
    addTasksIntervalInSeconds: number;
    maxWallClockTimeInHours: number;
}

export interface ScanRunTimeConfig {
    minLastReferenceSeenInDays: number;
    pageRescanIntervalInDays: number;
    failedPageRescanIntervalInHours: number;
    maxScanRetryCount: number;
    accessibilityRuleExclusionList: string[];
}

export interface RestApiConfig {
    maxScanRequestBatchCount: number;
}

export interface RuntimeConfig {
    logConfig: LogRuntimeConfig;
    taskConfig: TaskRuntimeConfig;
    queueConfig: QueueRuntimeConfig;
    scanConfig: ScanRunTimeConfig;
    jobManagerConfig: JobManagerConfig;
    restApiConfig: RestApiConfig;
}

@injectable()
export class ServiceConfiguration {
    public static readonly profilePath = `${__dirname}/runtime-config.json`;
    private readonly fileSystem: typeof fs;
    private loadConfigPromise: Promise<convict.Config<RuntimeConfig>>;
    private readonly convictModule: typeof convict;

    constructor(fileSystem: typeof fs = fs, convictModule: typeof convict = convict) {
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
                messageVisibilityTimeoutInSeconds: {
                    format: 'int',
                    default: 180,
                    doc: 'Message visibility timeout in seconds',
                },
            },
            taskConfig: {
                taskTimeoutInMinutes: {
                    format: 'int',
                    default: 3,
                    doc: 'Timeout value after which the task has to be terminated',
                },
            },
            jobManagerConfig: {
                activeToRunningTasksRatio: {
                    format: Number,
                    default: 3,
                    // tslint:disable-next-line: max-line-length
                    doc: `The target overload ratio of queued to running tasks. Higher ratio value will result higher queued tasks count.`,
                },
                addTasksIntervalInSeconds: {
                    format: 'int',
                    default: 15,
                    doc: 'The time interval at which a job manager adds tasks to the job.',
                },
                maxWallClockTimeInHours: {
                    format: 'int',
                    default: 29,
                    doc: 'The amount of time the job manager instance will run.',
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
                accessibilityRuleExclusionList: {
                    format: Array,
                    default: [],
                    doc: 'Axe core rule exclusion list',
                },
            },
            restApiConfig: {
                maxScanRequestBatchCount: {
                    format: 'int',
                    default: 1000,
                    doc: 'Maximum number of scan requests in a single HTTP client request.',
                },
            },
        };
    }
}
