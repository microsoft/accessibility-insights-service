// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';

export interface CrawlRequestProcessor {
    handleRequest(inputs: Apify.HandleRequestInputs): Promise<void>;
    handleRequestError(inputs: Apify.HandleFailedRequestInput): void | Promise<void>;
    getResults(): string[];
}
