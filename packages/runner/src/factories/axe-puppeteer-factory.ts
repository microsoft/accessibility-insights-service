// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

@injectable()
export class AxePuppeteerFactory {
    public createAxePuppteteer(page: Puppeteer.Page): AxePuppeteer {
        return new AxePuppeteer(page);
    }
}
