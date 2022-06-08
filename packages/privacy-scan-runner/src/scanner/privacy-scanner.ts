// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult, pageTimeoutConfig } from 'scanner-global-library';
import { CookieScenario, getAllCookieScenarios } from 'privacy-scan-core';

@injectable()
export class PrivacyScanner {
    constructor(
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly getCookieScenarios: () => CookieScenario[] = getAllCookieScenarios,
        private readonly maxPageNavigationTimeMsec: number = pageTimeoutConfig.maxPageNavigationTimeMsec,
    ) {}

    public async scan(page: Page): Promise<PrivacyScanResult> {
        // privacy scan consists of several page reloads corresponding to cookie collection scenarios
        // hence calculation total privacy scan time
        const scanTimeoutMsec = this.maxPageNavigationTimeMsec * this.getCookieScenarios().length;

        return this.promiseUtils.waitFor(this.scanImpl(page), scanTimeoutMsec, () => {
            this.logger.logError(`Privacy scan timed out after ${scanTimeoutMsec / 60000} minutes`);

            return Promise.resolve({
                error: {
                    errorType: 'ScanTimeout',
                    message: `Privacy scan timed out after ${scanTimeoutMsec / 60000} minutes`,
                    stack: new Error().stack,
                },
            } as PrivacyScanResult);
        });
    }

    private async scanImpl(page: Page): Promise<PrivacyScanResult> {
        try {
            this.logger.logInfo(`Starting privacy scan of a webpage.`);
            const scanResult = await page.scanForPrivacy();
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
