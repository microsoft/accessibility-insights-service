// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import convict from 'convict';
import { injectable } from 'inversify';
import { isNil } from 'lodash';

export interface TaskRuntimeConfig {
    taskTimeoutInMinutes: number;
    retentionTimeInDays: number;
    maxTaskRetryCount: number;
}

export interface QueueRuntimeConfig {
    maxQueueSize: number;
    messageVisibilityTimeoutInSeconds: number;
    maxDequeueCount: number;
}

export interface LogRuntimeConfig {
    logInConsole: boolean;
}

export interface JobManagerConfig {
    activeToRunningTasksRatio: number;
    addTasksIntervalInSeconds: number;
    maxWallClockTimeInHours: number;
    sendNotificationTasksCount: number;
    scanRunnerTaskImageName: string;
    sendNotificationTaskImageName: string;
}

export interface ScanRunTimeConfig {
    minLastReferenceSeenInDays: number;
    pageRescanIntervalInDays: number;
    failedPageRescanIntervalInHours: number;
    maxScanRetryCount: number;
    maxSendNotificationRetryCount: number;
    scanTimeoutInMin: number;
}

export interface RestApiConfig {
    maxScanRequestBatchCount: number;
    scanRequestProcessingDelayInSeconds: number;
    minScanPriorityValue: number;
    maxScanPriorityValue: number;
}

export interface RuntimeConfig {
    featureFlags: FeatureFlags;
    logConfig: LogRuntimeConfig;
    taskConfig: TaskRuntimeConfig;
    queueConfig: QueueRuntimeConfig;
    scanConfig: ScanRunTimeConfig;
    jobManagerConfig: JobManagerConfig;
    restApiConfig: RestApiConfig;
    availabilityTestConfig: AvailabilityTestConfig;
}

export interface FeatureFlags {
    sendNotification: boolean;
}

export interface AvailabilityTestConfig {
    urlToScan: string;
    scanWaitIntervalInSeconds: number;
    maxScanWaitTimeInSeconds: number;
    logQueryTimeRange: string;
    environmentDefinition: string;
    consolidatedReportId: string;
}

export declare type ResourceType = 'batch' | 'registry';

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

    public getAzureResourceName(sourceResourceType: ResourceType, sourceResourceName: string, targetResourceType: ResourceType): string {
        // Expected resource name format ally<resourceType><resourceGroupSuffix>
        return sourceResourceName.replace(sourceResourceType, targetResourceType);
    }

    private async getConvictConfig(): Promise<convict.Config<RuntimeConfig>> {
        if (isNil(this.loadConfigPromise)) {
            this.loadConfigPromise = new Promise((resolve, reject) => {
                const config = this.convictModule<RuntimeConfig>(this.getRuntimeConfigSchema());

                // eslint-disable-next-line security/detect-non-literal-fs-filename
                this.fileSystem.exists(ServiceConfiguration.profilePath, (exists) => {
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
            featureFlags: {
                sendNotification: {
                    format: 'Boolean',
                    default: false,
                    doc: 'Property to decide if we should notify after scan completed.',
                },
            },
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
                    doc: 'Maximum message count in scan request queue.',
                },
                maxDequeueCount: {
                    format: 'int',
                    default: 2,
                    doc: 'Maximum number of times message can be dequeued from a storage queue.',
                },
                messageVisibilityTimeoutInSeconds: {
                    format: 'int',
                    default: 300,
                    doc: 'Message visibility timeout in seconds. Must correlate with taskTimeoutInMinutes config value.',
                },
            },
            taskConfig: {
                taskTimeoutInMinutes: {
                    format: 'int',
                    default: 5,
                    doc:
                        'Timeout value after which the task has to be terminated. Must correlate with messageVisibilityTimeoutInSeconds config value.',
                },
                retentionTimeInDays: {
                    format: 'int',
                    default: 3,
                    doc:
                        'The minimum time to retain the working directory for the task on the compute node where it ran, from the time it completes execution. After this time, the Batch service may delete the working directory and all its contents.',
                },
                maxTaskRetryCount: {
                    format: 'int',
                    default: 2,
                    doc: 'The maximum number of times the task may be retried.',
                },
            },
            jobManagerConfig: {
                activeToRunningTasksRatio: {
                    format: Number,
                    default: 3,
                    // eslint-disable-next-line max-len
                    doc: `The target overload ratio of queued to running tasks. Higher ratio value will result higher queued tasks count.`,
                },
                addTasksIntervalInSeconds: {
                    format: 'int',
                    default: 20,
                    doc: 'The time interval at which a job manager adds tasks to the job.',
                },
                maxWallClockTimeInHours: {
                    format: 'int',
                    default: 1,
                    doc: 'The amount of time the job manager instance will run continuously.',
                },
                sendNotificationTasksCount: {
                    format: 'int',
                    default: 100,
                    doc: 'Number of scan notification tasks that can be in active/running state',
                },
                scanRunnerTaskImageName: {
                    format: 'String',
                    default: 'batch-scan-runner',
                    doc: 'The Docker image name used for task creation.',
                },
                sendNotificationTaskImageName: {
                    format: 'String',
                    default: 'batch-scan-notification-runner',
                    doc: 'The Docker image name used for task creation.',
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
                maxSendNotificationRetryCount: {
                    format: 'int',
                    default: 5,
                    doc: 'Maximum number of retries allowed for a scan notification sending',
                },
                scanTimeoutInMin: {
                    default: 3,
                    format: 'int',
                    doc: 'Maximum allowed time for scanning a web page in minutes',
                },
            },
            restApiConfig: {
                maxScanRequestBatchCount: {
                    format: 'int',
                    default: 250,
                    doc: 'Maximum number of scan requests in a single HTTP client request.',
                },
                scanRequestProcessingDelayInSeconds: {
                    format: 'int',
                    default: 15,
                    doc: 'The scan request processing delay interval in seconds for a new submitted request.',
                },
                minScanPriorityValue: {
                    format: 'int',
                    default: -1000,
                    doc:
                        'Priority values can range from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority.\
                        This range correlates with Azure Batch pool task priority range.',
                },
                maxScanPriorityValue: {
                    format: 'int',
                    default: 1000,
                    doc:
                        'Priority values can range from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority.\
                        This range correlates with Azure Batch pool task priority range.',
                },
            },
            availabilityTestConfig: {
                urlToScan: {
                    format: 'String',
                    default: 'https://www.washington.edu/accesscomputing/AU/before.html',
                    doc: 'Url to scan for availability testing',
                },
                consolidatedReportId: {
                    format: 'String',
                    default: 'e2e-consolidated-report-id',
                    doc: 'The id for the consolidated report',
                },
                maxScanWaitTimeInSeconds: {
                    format: 'int',
                    default: 900,
                    doc: 'Maximum wait time for fetching scan status of the submitted request',
                },
                scanWaitIntervalInSeconds: {
                    format: 'int',
                    default: 60,
                    doc: 'Time to wait before checking the url scan status again',
                },
                logQueryTimeRange: {
                    format: String,
                    default: 'P1D',
                    doc: 'The Application Insights query time range',
                },
                environmentDefinition: {
                    format: String,
                    default: 'canary',
                    doc: 'The environment definition used to select tests to run',
                },
            },
        };
    }
}
