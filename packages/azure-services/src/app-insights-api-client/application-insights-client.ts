// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import got, { Agents, Got, ExtendOptions, Options } from 'got';
import { getForeverAgents, ResponseWithBodyType } from 'common';
import { EventsQueryOptions } from './events-query-options';
import { ApplicationInsightsEventsResponse } from './events-query-response';
import { ApplicationInsightsQueryResponse } from './query-response';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
        request: Got = got,
        getAgentsFn: () => Agents = getForeverAgents,
    ) {
        this.defaultRequestObject = request.extend({
            ...this.defaultOptions,
            headers: {
                'X-Api-Key': this.apiKey,
            },
            agent: getAgentsFn(),
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
