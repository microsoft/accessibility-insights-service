// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { AxeScanResults, Page } from 'scanner-global-library';
import { System } from 'common';

@injectable()
export class AIScanner {
    constructor(@inject(Page) private readonly page: Page) {}

    public async scan(url: string, browserExecutablePath?: string, sourcePath?: string): Promise<AxeScanResults> {
        try {
            console.log(`Starting accessibility scanning of URL ${url}`);
            await this.page.create({ browserExecutablePath });
            await this.page.navigateToUrl(url);

            return await this.page.scanForA11yIssues(sourcePath);
        } catch (error) {
            console.log(error, `An error occurred while scanning website page ${url}`);

            return { error: System.serializeError(error) };
        } finally {
            await this.page.close();
            console.log(`Accessibility scanning of URL ${url} completed`);
        }
    }

    public getUserAgent(): string {
        return this.page.userAgent;
    }
}
