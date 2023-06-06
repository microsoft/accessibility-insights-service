// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import path from 'path';
import * as Crawlee from '@crawlee/puppeteer';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';

/* eslint-disable no-invalid-this */

export interface CrawlRequestProcessor {
    requestHandler: Crawlee.RequestHandler;
    failedRequestHandler: Crawlee.ErrorHandler;
    getResults(): string[];
}

@injectable()
export class UrlCollectionRequestProcessor implements CrawlRequestProcessor {
    public requestHandler: Crawlee.PuppeteerRequestHandler = async ({ request }) => {
        // workaround to skip known non-html content to unblock WCP
        // the web page content type can be detected only after receiving HTTP Content-Type header value
        // after page content type is detected the page should be marked as non-scannable and processed respectively
        // this will be implemented in web insights service
        const ext = path.extname(request.url);
        if (ext === '.xml') {
            return;
        }

        this.urlList.push(request.url);
    };

    public failedRequestHandler: Crawlee.ErrorHandler = async ({ request }, error) => {
        this.logger.logError('Error processing crawl request in UrlCollectionRequestProcessor', {
            error: System.serializeError(error),
            request: JSON.stringify(request),
        });
    };

    public getResults = (): string[] => {
        return this.urlList;
    };

    public constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger, private readonly urlList: string[] = []) {}
}
