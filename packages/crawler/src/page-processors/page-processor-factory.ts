// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as url from 'url';
import { PageProcessor, PageProcessorOptions } from './page-processor-base';

export interface PageProcessorFactory {
    createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor;
}

export abstract class PageProcessorFactoryBase {
    public abstract createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor;

    protected getDiscoveryPattern(baseUrl: string, discoveryPatterns: string[]): string[] {
        return discoveryPatterns === undefined ? this.getDefaultDiscoveryPattern(baseUrl) : discoveryPatterns;
    }

    protected getDefaultDiscoveryPattern(baseUrl: string): string[] {
        const baseUrlObj = url.parse(baseUrl);

        return [`http[s?]://${baseUrlObj.host}${baseUrlObj.path}[.*]`];
    }
}
