// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as util from 'util';
import { AxeScanResults } from './axe-scan-results';
import { Page } from './page';

@injectable()
export class AIScanner {
    constructor(@inject(Page) private readonly page: Page) {}

    public async scan(url: string): Promise<AxeScanResults> {
        try {
            console.log(`Starting accessibility scanning of URL ${url}.`);

            await this.page.create();
            await this.page.enableBypassCSP();

            return await this.page.scanForA11yIssues(url);
        } catch (error) {
            console.log(error, `An error occurred while scanning website page ${url}.`);

            return { error: util.inspect(error) };
        } finally {
            await this.page.close();
            console.log(`Accessibility scanning of URL ${url} completed.`);
        }
    }
}
