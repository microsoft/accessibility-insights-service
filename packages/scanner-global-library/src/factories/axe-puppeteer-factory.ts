// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { iocTypes } from '../ioc-types';
import { RuleExclusion } from './rule-exclusion';
import { AxeConfiguration } from './axe-configuration';

@injectable()
export class AxePuppeteerFactory {
    constructor(
        @inject(iocTypes.AxeConfiguration) private readonly axeConfiguration: AxeConfiguration,
        private readonly ruleExclusion: RuleExclusion = new RuleExclusion(),
        private readonly fileSystemObj: typeof fs = fs,
    ) {}

    public async createAxePuppeteer(page: Puppeteer.Page, contentSourcePath?: string): Promise<AxePuppeteer> {
        let maybeContentSource: string;

        if (!isEmpty(contentSourcePath)) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const contentBuffer = this.fileSystemObj.readFileSync(contentSourcePath);
            maybeContentSource = contentBuffer.toString();
        }

        return new AxePuppeteer(page, maybeContentSource)
            .configure(this.axeConfiguration)
            .disableRules(this.ruleExclusion.accessibilityRuleExclusionList);
    }
}
