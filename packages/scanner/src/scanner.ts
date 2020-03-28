// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { PromiseUtils, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import * as util from 'util';
import { AxeScanResults } from './axe-scan-results';
import { Page } from './page';

@injectable()
export class Scanner {
    constructor(
        @inject(Page) private readonly page: Page,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(PromiseUtils)
        private readonly promiseUtils: PromiseUtils,
        @inject(ServiceConfiguration)
        private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async scan(url: string): Promise<AxeScanResults> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');

        return this.promiseUtils.waitFor(this.scanWithoutTimeout(url), scanConfig.scanTimeoutInMin * 60000, () =>
            // tslint:disable-next-line: no-object-literal-type-assertion
            Promise.resolve({
                error: {
                    errorType: 'ScanTimeout',
                    message: `Scan timed out after ${scanConfig.scanTimeoutInMin} minutes`,
                },
                pageResponseCode: undefined,
            } as AxeScanResults),
        );
    }

    private async scanWithoutTimeout(url: string): Promise<AxeScanResults> {
        try {
            this.logger.logInfo(`[scanner] Starting accessibility scanning of URL ${url}.`);

            await this.page.create();
            await this.page.enableBypassCSP();

            return await this.page.scanForA11yIssues(url);
        } catch (error) {
            this.logger.trackExceptionAny(error, `[scanner] An error occurred while scanning website page ${url}.`);

            return { error: util.inspect(error), pageResponseCode: undefined };
        } finally {
            try {
                await this.page.close();
            } catch (error) {
                this.logger.logError('[scanner] unable to close web page');
            }
            this.logger.logInfo(`[scanner] Accessibility scanning of URL ${url} completed.`);
        }
    }
}
