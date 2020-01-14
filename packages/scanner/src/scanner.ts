// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import * as util from 'util';
import { AxeScanResults } from './axe-scan-results';
import { Page } from './page';

@injectable()
export class Scanner {
    constructor(@inject(Page) private readonly page: Page, @inject(Logger) private readonly logger: Logger) {}

    public async scan(url: string): Promise<AxeScanResults> {
        try {
            this.logger.logInfo(`[scanner] Starting accessibility scanning of URL ${url}.`);

            await this.page.create();
            await this.page.enableBypassCSP();

            return await this.page.scanForA11yIssues(url);
        } catch (error) {
            this.logger.trackExceptionAny(error, `[scanner] An error occurred while scanning website page ${url}.`);

            return { error: util.inspect(error), pageResponseCode: undefined };
        } finally {
            await this.page.close();
            this.logger.logInfo(`[scanner] Accessibility scanning of URL ${url} completed.`);
        }
    }
}
