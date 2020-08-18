// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ClassicPageProcessor } from './classic-page-processor';
import { PageProcessor, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactoryBase } from './page-processor-factory';

export class ClassicPageProcessorFactory extends PageProcessorFactoryBase {
    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor {
        return new ClassicPageProcessor(
            pageProcessorOptions.requestQueue,
            this.getDiscoveryPattern(pageProcessorOptions.baseUrl, pageProcessorOptions.discoveryPatterns),
        );
    }
}
