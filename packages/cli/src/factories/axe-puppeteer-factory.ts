// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { RuleExclusion } from './rule-exclusion';

@injectable()
export class AxePuppeteerFactory {
    public async createAxePuppeteer(page: Puppeteer.Page): Promise<AxePuppeteer> {
        const ruleExclusionList = new RuleExclusion();

        return new AxePuppeteer(page).disableRules(ruleExclusionList.accessibilityRuleExclusionList);
    }
}
