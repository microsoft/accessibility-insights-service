// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import path from 'path';
import { HandleRequestInputs, HandleFailedRequestInput } from 'apify';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { isEmpty } from 'lodash';
import { CrawlRequestProcessor } from './crawl-request-processor';

/* eslint-disable no-invalid-this */

@injectable()
export class UrlCollectionRequestProcessor implements CrawlRequestProcessor {
    public handleRequest = async (inputs: HandleRequestInputs): Promise<void> => {
        // filter out non-html link
        const ext = path.extname(inputs.request.url);
        if (isEmpty(ext) || ext === '.htm' || ext === '.html' || ext.length > 4) {
            this.urlList.push(inputs.request.url);
        }
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
