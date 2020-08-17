// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ClassicPageProcessor } from './classic-page-processor';
import { PageProcessor, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactoryBase } from './page-processor-factory';
import { PageProcessorHelper } from './page-processor-helper';

export class ClassicPageProcessorFactory extends PageProcessorFactoryBase {
    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor {
        const helper = new PageProcessorHelper(pageProcessorOptions.requestQueue, pageProcessorOptions.logger);

        return new ClassicPageProcessor(
            pageProcessorOptions.requestQueue,
            pageProcessorOptions.logger,
            helper,
            this.getDiscoveryPattern(pageProcessorOptions.baseUrl, pageProcessorOptions.discoveryPatterns),
        );
    }
}
