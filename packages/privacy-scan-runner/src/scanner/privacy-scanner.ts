// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult } from 'scanner-global-library';

@injectable()
export class PrivacyScanner {
    constructor(
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly scannerImpl: () => Promise<PrivacyScanResult> = () => Promise.resolve({ state: 'pass' } as PrivacyScanResult), // TBD
    ) {}

    public async scan(page: Page): Promise<PrivacyScanResult> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');

        return this.promiseUtils.waitFor(this.scanImpl(page), scanConfig.scanTimeoutInMin * 60000, () => {
            this.logger.logError(`Privacy scan timed out after ${scanConfig.scanTimeoutInMin} minutes`);

            return Promise.resolve({
                error: {
                    errorType: 'ScanTimeout',
                    message: `Privacy scan timed out after ${scanConfig.scanTimeoutInMin} minutes`,
                    stack: new Error().stack,
                },
            } as PrivacyScanResult);
        });
    }

    private async scanImpl(page: Page): Promise<PrivacyScanResult> {
        try {
            this.logger.logInfo(`Starting privacy scan of a webpage.`);
            const scanResult = await this.scannerImpl(); // TDB
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
