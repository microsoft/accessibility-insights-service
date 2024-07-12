// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import convict from 'convict';
import { injectable } from 'inversify';
import { isNil } from 'lodash';

export interface RuntimeConfig {
    featureFlags: FeatureFlags;
    logConfig: LogRuntimeConfig;
    taskConfig: TaskRuntimeConfig;
    queueConfig: QueueRuntimeConfig;
    scanConfig: ScanRunTimeConfig;
    jobManagerConfig: JobManagerConfig;
    restApiConfig: RestApiConfig;
    availabilityTestConfig: AvailabilityTestConfig;
    crawlConfig: CrawlConfig;
    privacyScanConfig: PrivacyScanConfig;
    metricsConfig: MetricsConfig;
}

export interface TaskRuntimeConfig {
    taskTimeoutInMinutes: number;
    retentionTimeInDays: number;
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
    maxWallClockTimeInMinutes: number;
    sendNotificationTasksCount: number;
    scanRunnerTaskImageName: string;
    sendNotificationTaskImageName: string;
    privacyScanRunnerTaskImageName: string;
    reportGeneratorRunnerTaskImageName: string;
    accessibilityScanJobGroup: string;
    sendNotificationJobGroup: string;
    privacyScanJobGroup: string;
    reportGeneratorJobGroup: string;
}

export interface ScanRunTimeConfig {
    failedScanRetryIntervalInMinutes: number;
    maxFailedScanRetryCount: number;
    maxSendNotificationRetryCount: number;
    maxScanStaleTimeoutInMinutes: number;
    scanTimeoutInMin: number;
}

export interface RestApiConfig {
    maxScanRequestBatchCount: number;
    scanRequestProcessingDelayInSeconds: number;
    minScanPriorityValue: number;
    maxScanPriorityValue: number;
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
    consolidatedIdBase: string;
    scanNotifyApiEndpoint: string;
    scanNotifyFailApiEndpoint: string;
    maxScanCompletionNotificationWaitTimeInSeconds: number;
    maxDeepScanWaitTimeInSeconds: number;
}

export interface CrawlConfig {
    deepScanDiscoveryLimit: number;
    deepScanUpperLimit: number;
}

export interface PrivacyScanConfig {
    bannerXPath: string;
    bannerDetectionTimeout: number;
}

export interface MetricsConfig {
    account: string;
    namespace: string;
    resourceId: string;
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
                console.log(`Loading config file ${ServiceConfiguration.profilePath}`);
                this.fileSystem.exists(ServiceConfiguration.profilePath, (exists) => {
                    if (exists === true) {
                        config.loadFile(ServiceConfiguration.profilePath);
                        config.validate({ allowed: 'strict' });
                    } else {
                        console.log(`Unable to load config file. Using default config settings ${config}`);
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
                    default: true,
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
                    default: 100,
                    doc: 'Maximum message count in scan request queue.',
                },
                messageVisibilityTimeoutInSeconds: {
                    format: 'int',
                    default: 30 * 1.5 * 60, // maxWallClockTimeInMinutes * delta termination wait time
                    doc: 'Message visibility timeout in seconds. Must correlate with jobManagerConfig.maxWallClockTimeInMinutes config value.',
                },
            },
            taskConfig: {
                taskTimeoutInMinutes: {
                    format: 'int',
                    default: 20,
                    doc: 'Timeout value after which the task has to be terminated. Must correlate with queueConfig.messageVisibilityTimeoutInSeconds config value.',
                },
                retentionTimeInDays: {
                    format: 'int',
                    default: 3,
                    doc: 'The minimum time to retain the working directory for the task on the compute node where it ran, from the time it completes execution. After this time, the Batch service may delete the working directory and all its contents.',
                },
            },
            jobManagerConfig: {
                activeToRunningTasksRatio: {
                    format: Number,
                    default: 3,
                    doc: `The target overload ratio of queued to running tasks. Higher ratio value will result higher queued tasks count.`,
                },
                addTasksIntervalInSeconds: {
                    format: 'int',
                    default: 20,
                    doc: 'The time interval at which a job manager adds tasks to the job.',
                },
                maxWallClockTimeInMinutes: {
                    format: 'int',
                    default: 30,
                    doc: 'The amount of time the job manager instance will run continuously. Must correlate with queueConfig.messageVisibilityTimeoutInSeconds config value.',
                },
                sendNotificationTasksCount: {
                    format: 'int',
                    default: 100,
                    doc: 'Number of scan notification tasks that can be in active/running state',
                },
                scanRunnerTaskImageName: {
                    format: 'String',
                    default: 'batch-scan-runner',
                    doc: 'The container image name used for task creation.',
                },
                sendNotificationTaskImageName: {
                    format: 'String',
                    default: 'batch-scan-notification-runner',
                    doc: 'The container image name used for task creation.',
                },
                privacyScanRunnerTaskImageName: {
                    format: 'String',
                    default: 'batch-privacy-scan-runner',
                    doc: 'The container image name used for task creation.',
                },
                reportGeneratorRunnerTaskImageName: {
                    format: 'String',
                    default: 'batch-report-generator-runner',
                    doc: 'The container image name used for task creation.',
                },
                accessibilityScanJobGroup: {
                    format: 'String',
                    default: 'on-demand-url-scan-schedule',
                    doc: 'The prefix for accessibility scan batch job id.',
                },
                sendNotificationJobGroup: {
                    format: 'String',
                    default: 'on-demand-send-notification-schedule',
                    doc: 'The prefix for send notification batch job id.',
                },
                privacyScanJobGroup: {
                    format: 'String',
                    default: 'privacy-scan-schedule',
                    doc: 'The prefix for privacy scan batch job id.',
                },
                reportGeneratorJobGroup: {
                    format: 'String',
                    default: 'report-generator-schedule',
                    doc: 'The prefix for report generator batch job id.',
                },
            },
            scanConfig: {
                failedScanRetryIntervalInMinutes: {
                    format: 'int',
                    default: 45,
                    doc: 'The minimum wait time before next retry of a failed scan request.',
                },
                maxFailedScanRetryCount: {
                    format: 'int',
                    default: 2,
                    doc: 'Maximum number of retries (additional times to re-run a scan) allowed for a failed scan request.',
                },
                maxSendNotificationRetryCount: {
                    format: 'int',
                    default: 5,
                    doc: 'Maximum number of retries allowed for a scan notification sending',
                },
                maxScanStaleTimeoutInMinutes: {
                    format: 'int',
                    default: 4320,
                    doc: 'Maximum sliding window for a scan to complete.',
                },
                scanTimeoutInMin: {
                    default: 5,
                    format: 'int',
                    doc: 'Maximum allowed time for accessibility scanning a web page in minutes',
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
                    default: 300,
                    doc: 'The scan request processing delay interval in seconds for a new submitted request.',
                },
                minScanPriorityValue: {
                    format: 'int',
                    default: -1000,
                    doc: 'Priority values can range from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority.\
                        This range correlates with Azure Batch pool task priority range.',
                },
                maxScanPriorityValue: {
                    format: 'int',
                    default: 1000,
                    doc: 'Priority values can range from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority.\
                        This range correlates with Azure Batch pool task priority range.',
                },
            },
            availabilityTestConfig: {
                urlToScan: {
                    format: 'String',
                    default: undefined,
                    doc: 'Url to scan for availability testing',
                },
                consolidatedIdBase: {
                    format: 'String',
                    default: 'e2e-consolidated-report-id',
                    doc: 'The id prefix for the consolidated report',
                },
                maxScanWaitTimeInSeconds: {
                    format: 'int',
                    default: 3600,
                    doc: 'Maximum wait time for scan request to complete',
                },
                maxScanCompletionNotificationWaitTimeInSeconds: {
                    format: 'int',
                    default: 600,
                    doc: 'Maximum wait time for scan notification request to complete',
                },
                maxDeepScanWaitTimeInSeconds: {
                    format: 'int',
                    default: 3600,
                    doc: 'Maximum wait time for deep scan to complete',
                },
                scanWaitIntervalInSeconds: {
                    format: 'int',
                    default: 180,
                    doc: 'Time to wait before checking E2E test orchestration workflow activity result',
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
                scanNotifyApiEndpoint: {
                    format: 'String',
                    default: '/scan-notification-url',
                    doc: 'The end-point to hit when a scan is completed and will respond successfully',
                },
                scanNotifyFailApiEndpoint: {
                    format: 'String',
                    default: '/scan-notification-url-fail',
                    doc: 'The end-point to hit when a scan is completed and will respond unsuccessfully',
                },
            },
            crawlConfig: {
                deepScanDiscoveryLimit: {
                    format: 'int',
                    default: 100, // Must be at least high enough to allow the largest E2E deep scan test to complete
                    doc: 'The maximum number of URLs that will be discovered for a deep scan request',
                },
                deepScanUpperLimit: {
                    format: 'int',
                    default: 5000,
                    doc: 'The maximum number of URLs that will be accepted for a deep scan request',
                },
            },
            privacyScanConfig: {
                bannerXPath: {
                    format: 'String',
                    default: '//div[@id="wcpConsentBannerCtrl"]',
                    doc: 'The default XPath to use for consent banner detection',
                },
                bannerDetectionTimeout: {
                    format: 'int',
                    default: 20000,
                    doc: 'The maximum time in milliseconds to wait for the banner XPath after the initial page load has completed',
                },
            },
            metricsConfig: {
                account: {
                    format: 'String',
                    default: undefined,
                },
                namespace: {
                    format: 'String',
                    default: undefined,
                },
                resourceId: {
                    format: 'String',
                    default: undefined,
                },
            },
        };
    }
}
