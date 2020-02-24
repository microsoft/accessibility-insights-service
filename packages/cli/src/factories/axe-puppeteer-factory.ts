// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import * as fs from 'fs';
import { injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import * as path from 'path';
import * as Puppeteer from 'puppeteer';
import { RuleExclusion } from './rule-exclusion';

@injectable()
export class AxePuppeteerFactory {
    public async createAxePuppeteer(page: Puppeteer.Page, sourcePath?: string): Promise<AxePuppeteer> {
        let content;
        const ruleExclusionList = new RuleExclusion();

        if (!isNil(sourcePath) && !isEmpty(sourcePath)) {
            // tslint:disable-next-line: non-literal-fs-path
            content = fs.readFileSync(sourcePath);

            return new AxePuppeteer(page, content.toString()).disableRules(ruleExclusionList.accessibilityRuleExclusionList);
        }

        return new AxePuppeteer(page).disableRules(ruleExclusionList.accessibilityRuleExclusionList);
    }
}
