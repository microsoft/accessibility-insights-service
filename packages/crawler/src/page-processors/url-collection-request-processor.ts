// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HandleRequestInputs, HandleFailedRequestInput } from 'apify';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { RequestProcessor } from './request-processor';

/* eslint-disable no-invalid-this */

@injectable()
export class UrlCollectionRequestProcessor implements RequestProcessor {
    public constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger, private readonly urlList: string[] = []) {}

    public handleRequest = async (inputs: HandleRequestInputs): Promise<void> => {
        this.urlList.push(inputs.request.url);
    };

    public handleFailedRequest = async (inputs: HandleFailedRequestInput): Promise<void> => {
        this.logger.logError('Error processing crawl request in UrlCollectionRequestProcessor', {
            error: System.serializeError(inputs.error),
            request: JSON.stringify(inputs.request),
        });
    };

    public getResults = (): string[] => {
        return this.urlList;
    };
}
