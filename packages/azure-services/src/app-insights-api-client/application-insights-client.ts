// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ResponseAsJSON } from 'request';
import * as requestPromise from 'request-promise';
import { EventsQueryOptions } from './events-query-options';
import { ApplicationInsightsEventsResponse } from './events-query-response';
import { ApplicationInsightsQueryResponse } from './query-response';

// tslint:disable: no-any no-unsafe-any

export interface ResponseWithBodyType<T = {}> extends ResponseAsJSON {
    body: T;
}

@injectable()
export class ApplicationInsightsClient {
    public throwOnRequestFailure: boolean = false;

    private readonly baseUrl = 'https://api.applicationinsights.io/v1/apps';
    private readonly defaultRequestObject: typeof requestPromise;
    private readonly defaultOptions: requestPromise.RequestPromiseOptions = {
        forever: true,
        resolveWithFullResponse: true,
        json: true,
    };

    constructor(private readonly appId: string, private readonly apiKey: string, httpRequest: any = requestPromise) {
        this.defaultRequestObject = httpRequest.defaults({
            ...this.defaultOptions,
            headers: {
                'X-Api-Key': this.apiKey,
            },
        });
    }

    public async executeQuery(query: string, queryTimeRange: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/query`;
        const requestBody = {
            query,
            timespan: queryTimeRange,
        };
        const options: requestPromise.RequestPromiseOptions = {
            body: requestBody,
            simple: this.throwOnRequestFailure,
            json: true,
        };

        return this.defaultRequestObject.post(requestUrl, options);
    }

    public async queryEvents(
        eventType: string,
        eventsOptions?: EventsQueryOptions,
    ): Promise<ResponseWithBodyType<ApplicationInsightsEventsResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/events/${eventType}`;
        const options: requestPromise.RequestPromiseOptions = {
            qs: eventsOptions,
            simple: this.throwOnRequestFailure,
            json: true,
        };

        return this.defaultRequestObject.get(requestUrl, options);
    }
}
