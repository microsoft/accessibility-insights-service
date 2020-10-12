// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import got, { Agents, Response, Got, ExtendOptions, Options } from 'got';
import { getForeverAgents } from 'common';
import { EventsQueryOptions } from './events-query-options';
import { ApplicationInsightsEventsResponse } from './events-query-response';
import { ApplicationInsightsQueryResponse } from './query-response';

/* eslint-disable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/ban-types
export interface ResponseWithBodyType<T = {}> extends Response {
    body: T;
}

@injectable()
export class ApplicationInsightsClient {
    public throwOnRequestFailure: boolean = false;

    private readonly baseUrl = 'https://api.applicationinsights.io/v1/apps';
    private readonly defaultRequestObject: Got;
    private readonly defaultOptions: ExtendOptions = {
        responseType: 'json',
    };

    constructor(
        private readonly appId: string,
        private readonly apiKey: string,
        gotRequest: any = got,
        getAgents: () => Agents = getForeverAgents,
    ) {
        this.defaultRequestObject = gotRequest.extend({
            ...this.defaultOptions,
            headers: {
                'X-Api-Key': this.apiKey,
            },
            agent: getAgents(),
        });
    }

    public async executeQuery(query: string, queryTimeRange: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/query`;
        const requestBody = {
            query,
            timespan: queryTimeRange,
        };
        const options: Options = {
            json: requestBody,
            throwHttpErrors: this.throwOnRequestFailure,
        };

        return (await this.defaultRequestObject.post(requestUrl, options)) as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
    }

    public async queryEvents(
        eventType: string,
        eventsOptions?: EventsQueryOptions,
    ): Promise<ResponseWithBodyType<ApplicationInsightsEventsResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/events/${eventType}`;
        const options: Options = {
            searchParams: eventsOptions,
            throwHttpErrors: this.throwOnRequestFailure,
        };

        return (await this.defaultRequestObject.get(requestUrl, options)) as Promise<
            ResponseWithBodyType<ApplicationInsightsEventsResponse>
        >;
    }
}
