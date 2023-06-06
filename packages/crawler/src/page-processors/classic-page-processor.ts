// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { PageProcessorBase } from './page-processor-base';

/* eslint-disable no-invalid-this */

@injectable()
export class ClassicPageProcessor extends PageProcessorBase {
    public processPage: Crawlee.PuppeteerRequestHandler = async (context) => {
        console.log(`Processing page ${context.page.url()}`);
        await this.enqueueLinks(context);
        const axeResults = await this.accessibilityScanOp.run(
            context.page,
            context.request.id as string,
            this.crawlerConfiguration.axeSourcePath(),
        );
        const issueCount = axeResults?.violations?.length > 0 ? axeResults.violations.reduce((a, b) => a + b.nodes.length, 0) : 0;
        await this.saveSnapshot(context.page, context.request.id as string);
        await this.pushScanData({ id: context.request.id as string, url: context.request.url, succeeded: true, issueCount });
        await this.saveScanResult(context.request, issueCount);
    };
}
