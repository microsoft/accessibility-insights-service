// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { Response } from 'request';
import * as request from 'request-promise';
import { EventsQueryOptions } from './events-query-options';
import { ApplicationInsightsEventsResponse } from './events-query-response';
import { ApplicationInsightsQueryResponse } from './query-response';

export interface ResponseWithBodyType<T = {}> extends Response {
    body: T;
}

@injectable()
export class ApplicationInsightsClient {
    private readonly baseUrl = 'https://api.applicationinsights.io/v1/apps';
    private readonly defaultRequestObject: typeof request;
    private readonly defaultOptions: request.RequestPromiseOptions = {
        forever: true,
        resolveWithFullResponse: true,
        json: true,
    };

    constructor(
        private readonly appId: string,
        private readonly apiKey: string,
        private readonly throwOnRequestFailure: boolean = false,
        httpRequest = request,
    ) {
        this.defaultRequestObject = httpRequest.defaults({
            ...this.defaultOptions,
            simple: this.throwOnRequestFailure,
            headers: {
                'X-Api-Key': this.apiKey,
            },
        });
    }

    public async query(query: string, timespan: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/query`;
        const requestBody = {
            query,
            timespan,
        };
        const options: request.RequestPromiseOptions = {
            body: requestBody,
        };

        return this.defaultRequestObject.post(requestUrl, options);
    }

    public async events(
        eventType: string,
        eventsOptions?: EventsQueryOptions,
    ): Promise<ResponseWithBodyType<ApplicationInsightsEventsResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/events/${eventType}`;
        const options: request.RequestPromiseOptions = {
            qs: eventsOptions,
        };

        return this.defaultRequestObject.get(requestUrl, options);
    }
}
