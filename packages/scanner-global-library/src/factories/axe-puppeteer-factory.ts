// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import { AxePuppeteer } from 'axe-puppeteer';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { RuleExclusion } from './rule-exclusion';

@injectable()
export class AxePuppeteerFactory {
    constructor(private readonly ruleExclusion: RuleExclusion = new RuleExclusion(), private readonly fileSystemObj: typeof fs = fs) {}

    public async createAxePuppeteer(page: Puppeteer.Page, contentSourcePath?: string): Promise<AxePuppeteer> {
        if (!isEmpty(contentSourcePath)) {
            const content = this.fileSystemObj.readFileSync(contentSourcePath);

            return new AxePuppeteer(page, content.toString()).disableRules(this.ruleExclusion.accessibilityRuleExclusionList);
        }

        return new AxePuppeteer(page).disableRules(this.ruleExclusion.accessibilityRuleExclusionList);
    }
}
