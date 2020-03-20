// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ResponseAsJSON } from 'request';
import * as requestPromise from 'request-promise';

// tslint:disable: no-null-keyword no-any
export interface ResponseWithBodyType<T = {}> extends ResponseAsJSON {
    body: T;
}

@injectable()
export class NotificationSenderWebAPIClient {
    private readonly defaultRequestObject: typeof requestPromise;
    private readonly defaultOptions: requestPromise.RequestPromiseOptions = {
        forever: true,
        headers: {
            'Content-Type': 'application/json',
        },
        resolveWithFullResponse: true,
        json: true,
    };

    constructor(
        @inject(Logger) private readonly logger: Logger,
        private readonly throwOnRequestFailure: boolean = false,
        httpRequest: any = requestPromise,
    ) {
        this.defaultRequestObject = httpRequest.defaults({
            ...this.defaultOptions,
            simple: this.throwOnRequestFailure,
        });
    }

    public async postURL(url: string, name: string): Promise<ResponseAsJSON> {
        this.logger.logInfo(`Reply URL: ${url}`);
        this.logger.logInfo(`Name: ${name}`);
        console.log(`Reply URL: ${url}`);
        console.log(`Name: ${name}`);

        const requestBody = {
            name: name,
        };
        const options: requestPromise.RequestPromiseOptions = { body: requestBody };

        return this.defaultRequestObject.post(url, options);
    }
}
