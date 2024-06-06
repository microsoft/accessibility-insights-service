// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { PuppeteerTimeoutConfig } from '../page-timeout-config';
import { PageRequestInterceptor } from './page-request-interceptor';

@injectable()
export class PageNetworkTracer {
    constructor(
        @inject(PageRequestInterceptor) private readonly pageRequestInterceptor: PageRequestInterceptor,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async trace(url: string, page: Puppeteer.Page): Promise<void> {
        this.logger?.logInfo(`[Network] Enable page network trace`);
        await this.pageRequestInterceptor.intercept(
            async () => this.navigate(url, page),
            page,
            PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec,
            true,
        );
        this.logger?.logInfo(`[Network] Disable page network trace`);
    }

    private async navigate(url: string, page: Puppeteer.Page): Promise<void> {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec });
        } catch (error) {
            this.logger?.logError(`Page network trace navigation error.`, {
                error: System.serializeError(error),
            });
        }
    }
}
