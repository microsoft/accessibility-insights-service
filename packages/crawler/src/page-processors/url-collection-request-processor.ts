// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import path from 'path';
import { HandleRequestInputs, HandleFailedRequestInput } from 'apify';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { CrawlRequestProcessor } from './crawl-request-processor';

/* eslint-disable no-invalid-this */

@injectable()
export class UrlCollectionRequestProcessor implements CrawlRequestProcessor {
    public handleRequest = async (inputs: HandleRequestInputs): Promise<void> => {
        // workaround to skip known non-html content to unblock WCP
        // the web page content type can be detected only after receiving HTTP Content-Type header value
        // after page content type is detected the page should be marked as non-scannable and processed respectively
        // this will be implemented in web insights service
        const ext = path.extname(inputs.request.url);
        if (ext === '.xml') {
            return;
        }

        this.urlList.push(inputs.request.url);
    };

    public handleRequestError = async (inputs: HandleFailedRequestInput): Promise<void> => {
        this.logger.logError('Error processing crawl request in UrlCollectionRequestProcessor', {
            error: System.serializeError(inputs.error),
            request: JSON.stringify(inputs.request),
        });
    };

    public getResults = (): string[] => {
        return this.urlList;
    };

    public constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger, private readonly urlList: string[] = []) {}
}
