// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { injectable } from 'inversify';
import { PageProcessorBase } from './page-processor-base';

/* eslint-disable no-invalid-this */

@injectable()
export class ClassicPageProcessor extends PageProcessorBase {
    public processPage: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        console.log(`Processing page ${page.url()}`);
        await this.enqueueLinks(page);
        const axeResults = await this.accessibilityScanOp.run(page, request.id as string, this.crawlerConfiguration.axeSourcePath());
        const issueCount = axeResults?.violations?.length > 0 ? axeResults.violations.reduce((a, b) => a + b.nodes.length, 0) : 0;
        await this.saveSnapshot(page, request.id as string);
        await this.pushScanData({ id: request.id as string, url: request.url, succeeded: true, issueCount });
        await this.saveScanResult(request, issueCount);
    };
}
