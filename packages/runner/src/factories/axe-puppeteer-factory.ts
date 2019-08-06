// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

@injectable()
export class AxePuppeteerFactory {
    constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    public async createAxePuppteteer(page: Puppeteer.Page): Promise<AxePuppeteer> {
        const ruleExclusionList: string[] = (await this.serviceConfig.getConfigValue('scanConfig')).accessibilityRuleExclusionList;

        return new AxePuppeteer(page).disableRules(ruleExclusionList);
    }
}
