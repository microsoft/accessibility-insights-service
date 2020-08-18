// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ClassicPageProcessor } from './classic-page-processor';
import { getDiscoveryPattern } from './get-discovery-pattern';
import { PageProcessor, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactory } from './page-processor-factory';
import { PageProcessorHelper } from './page-processor-helper';

export class ClassicPageProcessorFactory implements PageProcessorFactory {
    public createPageProcessor(
        pageProcessorOptions: PageProcessorOptions,
        getDiscoveryPatternFunc: typeof getDiscoveryPattern = getDiscoveryPattern,
    ): PageProcessor {
        const helper = new PageProcessorHelper();

        return new ClassicPageProcessor(
            pageProcessorOptions.requestQueue,
            helper,
            getDiscoveryPatternFunc(pageProcessorOptions.baseUrl, pageProcessorOptions.discoveryPatterns),
        );
    }
}
