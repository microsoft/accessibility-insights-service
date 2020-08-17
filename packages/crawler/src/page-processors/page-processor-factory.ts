// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { PageProcessor, PageProcessorOptions } from './page-processor-base';

export interface PageProcessorFactory {
    createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor;
}
