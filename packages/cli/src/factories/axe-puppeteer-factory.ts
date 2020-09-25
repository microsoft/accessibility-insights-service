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
    constructor(private readonly fileSystemObj: typeof fs = fs) {}

    public async createAxePuppeteer(page: Puppeteer.Page, sourcePath?: string): Promise<AxePuppeteer> {
        const ruleExclusionList = new RuleExclusion();

        if (!isEmpty(sourcePath)) {
            const content = this.fileSystemObj.readFileSync(sourcePath);

            return new AxePuppeteer(page, content.toString()).disableRules(ruleExclusionList.accessibilityRuleExclusionList);
        }

        return new AxePuppeteer(page).disableRules(ruleExclusionList.accessibilityRuleExclusionList);
    }
}
