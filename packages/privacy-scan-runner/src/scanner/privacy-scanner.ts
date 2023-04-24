// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult } from 'scanner-global-library';
import { PrivacyScannerCore } from 'privacy-scan-core';

@injectable()
export class PrivacyScanner {
    constructor(
        @inject(PrivacyScannerCore) private readonly privacyScannerCore: PrivacyScannerCore,
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(url: string, page: Page): Promise<PrivacyScanResult> {
        const taskConfig = await this.serviceConfig.getConfigValue('taskConfig');
        const scanTimeoutMinute = taskConfig.taskTimeoutInMinutes;

        return this.promiseUtils.waitFor(this.scanImpl(url, page), scanTimeoutMinute * 60000, () => {
            this.logger.logError(`Privacy scan timed out after ${scanTimeoutMinute} minutes`);

            return Promise.resolve({
                error: {
                    errorType: 'ScanTimeout',
                    message: `Privacy scan timed out after ${scanTimeoutMinute} minutes`,
                    stack: new Error().stack,
                },
            } as PrivacyScanResult);
        });
    }

    private async scanImpl(url: string, page: Page): Promise<PrivacyScanResult> {
        try {
            this.logger.logInfo(`Starting privacy scan of a webpage.`);
            const scanResult = await this.privacyScannerCore.scan(url, page);
            this.logger.logInfo(`Privacy scanning of a webpage successfully completed.`);

            return scanResult;
        } catch (error) {
            this.logger.logError(`An error occurred while running privacy scan of a webpage.`, {
                error: System.serializeError(error),
            });

            // throw service originated error to indicate a service failure
            throw error;
        }
    }
}
