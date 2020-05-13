// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { PageProcessorBase, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactoryBase } from './page-processor-factory';

export class ClassicPageProcessor extends PageProcessorBase {
    public pageProcessor: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        await this.enqueueLinks(page);
        await this.accessibilityScanOp(page, request.id as string, this.blobStore);
    };
}

export class ClassicPageProcessorFactory extends PageProcessorFactoryBase {
    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessorBase {
        return new ClassicPageProcessor(
            pageProcessorOptions.requestQueue,
            this.getDiscoveryPattern(pageProcessorOptions.baseUrl, pageProcessorOptions.discoveryPatterns),
        );
    }
}
