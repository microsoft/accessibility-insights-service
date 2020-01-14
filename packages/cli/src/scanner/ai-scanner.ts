// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Spinner } from 'cli-spinner';
import { inject, injectable } from 'inversify';
import * as util from 'util';
import { AxeScanResults } from './axe-scan-results';
import { Page } from './page';

@injectable()
export class AIScanner {
    constructor(@inject(Page) private readonly page: Page) {}

    public async scan(url: string): Promise<AxeScanResults> {
        const spinner = new Spinner();
        try {
            console.log(`Starting accessibility scanning of URL ${url}.`);

            spinner.start();
            await this.page.create();
            await this.page.enableBypassCSP();

            return await this.page.scanForA11yIssues(url);
        } catch (error) {
            console.log(error, `An error occurred while scanning website page ${url}.`);

            return { error: util.inspect(error) };
        } finally {
            spinner.stop();
            await this.page.close();
            console.log(`Accessibility scanning of URL ${url} completed.`);
        }
    }
}
