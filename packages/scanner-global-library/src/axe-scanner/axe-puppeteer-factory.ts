// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { iocTypes } from '../ioc-types';
import { AxeConfiguration } from './axe-configuration';
import { AxeRunOptions } from './axe-run-options';

@injectable()
export class AxePuppeteerFactory {
    constructor(
        @inject(iocTypes.AxeConfiguration) private readonly axeConfiguration: AxeConfiguration,
        @inject(iocTypes.AxeRunOptions) private readonly axeRunOptions: AxeRunOptions,
        private readonly fileSystemObj: typeof fs = fs,
    ) {}

    public async createAxePuppeteer(page: Puppeteer.Page, contentSourcePath?: string, legacyMode: boolean = false): Promise<AxePuppeteer> {
        const axeSource = await this.getAxeSource(contentSourcePath);

        return new AxePuppeteer(page, axeSource).configure(this.axeConfiguration).options(this.axeRunOptions).setLegacyMode(legacyMode);
    }

    private async getAxeSource(contentSourcePath?: string): Promise<string> {
        if (isEmpty(contentSourcePath)) {
            // It's important that we default to this rather than allowing axe-puppeteer to use its
            // own default because axe-puppeteer uses a transitive dependency like "axe-core": "^1.2.3",
            // and we want to to instead force the use of the specific axe-core version and the report
            // package are pinned to.
            //
            // We can't rely on a resolution/lockfile for this because it's still true from the context
            // of an external consumer of the CLI package.
            return (await import('axe-core')).source;
        } else {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const contentBuffer = this.fileSystemObj.readFileSync(contentSourcePath);

            return contentBuffer.toString();
        }
    }
}
