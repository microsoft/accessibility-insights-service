// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxePuppeteer } from '@axe-core/puppeteer';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerFactory } from 'scanner-global-library';
import { AxeResults } from 'axe-core';

@injectable()
export class PageScanner {
    public constructor(@inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory) {}

    public async scan(page: Puppeteer.Page, axeSourcePath?: string): Promise<AxeResults> {
        const axePuppeteer: AxePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(page, axeSourcePath);

        return axePuppeteer.analyze();
    }
}
