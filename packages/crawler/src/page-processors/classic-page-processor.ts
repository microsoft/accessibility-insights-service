// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { injectable } from 'inversify';
import { PageProcessorBase } from './page-processor-base';

@injectable()
export class ClassicPageProcessor extends PageProcessorBase {
    public pageProcessor: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        console.log(`Crawling page ${page.url()}`);
        await this.enqueueLinks(page);
        await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
        await this.pushScanData({ id: request.id as string, url: request.url });
    };
}
