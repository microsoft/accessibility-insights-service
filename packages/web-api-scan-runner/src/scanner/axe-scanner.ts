// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';

@injectable()
export class AxeScanner {
    constructor(
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(page: Page): Promise<AxeScanResults> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');

        return this.promiseUtils.waitFor(this.scanImpl(page), scanConfig.scanTimeoutInMin * 60000, () =>
            Promise.resolve({
                error: {
                    errorType: 'ScanTimeout',
                    message: `Scan timed out after ${scanConfig.scanTimeoutInMin} minutes`,
                    stack: new Error().stack,
                },
            } as AxeScanResults),
        );
    }

    private async scanImpl(page: Page): Promise<AxeScanResults> {
        try {
            this.logger.logInfo(`Starting accessibility website page scanning.`);
            const scanResult = await page.scanForA11yIssues();
            this.logger.logInfo(`Accessibility scanning of website page successfully completed.`);

            return scanResult;
        } catch (error) {
            this.logger.logError(`An error occurred while scanning website page.`, { error: System.serializeError(error) });

            // throw service originated error to indicate a service failure
            throw error;
        }
    }
}
